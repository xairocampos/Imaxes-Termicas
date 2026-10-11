'use strict';

const PART_LABELS = {
  piano: 'Piano',
  flute: 'Frauta',
  viola: 'Viola',
  all: 'Todas as partes'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function css() {
  return `
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .toolbar { position: sticky; top: 0; display: flex; gap: 8px; padding: 10px; background: #111; z-index: 2; }
    .toolbar button { border: 1px solid #555; background: #fff; color: #111; padding: 8px 12px; cursor: pointer; }
    main { max-width: 980px; margin: 0 auto; padding: 22px 0 40px; }
    header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
    .eyebrow { margin: 0 0 4px; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #555; }
    h1 { margin: 0; font-size: 32px; font-weight: 500; }
    h2 { margin: 0; font-size: 24px; }
    .meta { text-align: right; font-size: 12px; line-height: 1.5; }
    .image-name { font-weight: 600; word-break: break-word; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0 18px; }
    .summary span { border: 1px solid #ccc; padding: 8px; min-height: 48px; }
    .summary b { display: block; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: #666; margin-bottom: 3px; }
    .part { break-inside: avoid; border: 2px solid #111; margin-bottom: 16px; }
    .part-head { display: flex; justify-content: space-between; align-items: end; gap: 12px; border-bottom: 1px solid #111; padding: 12px; }
    .part-head span { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #555; }
    .label { padding: 12px 12px 0; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #666; }
    .notes { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 12px 14px; }
    .note { border: 1px solid #111; padding: 8px 12px; font-size: 28px; font-weight: 500; line-height: 1; }
    .chord-list { display: grid; gap: 8px; padding: 10px 12px 14px; }
    .chord { display: grid; grid-template-columns: 90px 1fr; gap: 10px; align-items: center; border: 1px solid #111; padding: 8px; }
    .chord em { font-style: normal; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #555; }
    .chord strong { display: inline-block; margin: 3px 5px 3px 0; border: 1px solid #999; padding: 7px 10px; font-size: 26px; line-height: 1; }
    .cells { padding: 0 12px 12px; font-size: 13px; }
    .info { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 12px; }
    .info span { border: 1px solid #ccc; padding: 5px 8px; font-size: 11px; text-transform: uppercase; }
    .instruction { border-top: 1px solid #111; margin: 0; padding: 12px; font-size: 15px; line-height: 1.4; }
    @media print { .toolbar { display: none; } main { padding-top: 0; } .part { page-break-inside: avoid; } }
  `;
}

function flatNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.flatMap(item => Array.isArray(item) ? item : [item]).filter(Boolean);
}

function renderPianoNotes(notes) {
  if (!Array.isArray(notes) || !notes.length) return '<div class="notes"><span class="note">silencio</span></div>';
  return `<div class="chord-list">${notes.map((item, index) => {
    const chordNotes = Array.isArray(item) ? item : [item];
    return `<div class="chord"><em>Acorde ${index + 1}</em><span>${chordNotes.map(note => `<strong>${escapeHtml(note)}</strong>`).join('')}</span></div>`;
  }).join('')}</div>`;
}

function renderLinearNotes(notes) {
  const flat = flatNotes(notes);
  if (!flat.length) return '<div class="notes"><span class="note">silencio / aire</span></div>';
  return `<div class="notes">${flat.map(note => `<span class="note">${escapeHtml(note)}</span>`).join('')}</div>`;
}

function renderCells(part) {
  if (!part?.cells?.length) return '';
  return `<div class="cells"><strong>Celulas:</strong> ${part.cells.map(cell => escapeHtml(cell.join(' - '))).join(' / ')}</div>`;
}

function renderPart(score, partName) {
  const part = score.parts?.[partName];
  if (!part) return '';
  return `
    <section class="part">
      <div class="part-head">
        <h2>${escapeHtml(part.title || PART_LABELS[partName] || partName)}</h2>
        <span>${escapeHtml(part.modeLabel || part.mode || '')}</span>
      </div>
      <div class="label">${partName === 'piano' ? 'Acordes' : 'Notas'}</div>
      ${partName === 'piano' ? renderPianoNotes(part.notes) : renderLinearNotes(part.notes)}
      ${renderCells(part)}
      <div class="info">
        <span>${escapeHtml(part.duration || `${score.duration || 30} s`)}</span>
        <span>${escapeHtml(part.dynamics || '')}</span>
        <span>${escapeHtml(part.register || '')}</span>
        <span>${escapeHtml(part.technique || '')}</span>
      </div>
      <p class="instruction">${escapeHtml(part.instruction || '')}</p>
    </section>
  `;
}

function featureSummary(score) {
  const f = score.features || {};
  const items = [
    ['luminancia', f.meanLum],
    ['contraste', f.contrast],
    ['calor', f.warmRatio],
    ['frio', f.coolRatio],
    ['bordes', f.edgeDensity],
    ['complexidade', f.complexity],
    ['pitch field', (score.pitchField || []).join(' ')],
    ['resumo', score.visualSummary || '']
  ];
  return `<div class="summary">${items.map(([label, value]) => `<span><b>${escapeHtml(label)}</b>${escapeHtml(value ?? '-')}</span>`).join('')}</div>`;
}

function renderPrintableHtml(score, partName = 'all', options = {}) {
  const safePart = ['piano', 'flute', 'viola', 'all'].includes(partName) ? partName : 'all';
  const parts = safePart === 'all' ? ['piano', 'flute', 'viola'] : [safePart];
  const autoPrintScript = options.autoPrint
    ? '<script>window.addEventListener("load", () => setTimeout(() => window.print(), 250));</script>'
    : '';
  if (!score) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Cadros2</title><style>${css()}</style></head><body><main><h1>Sen partitura xerada</h1></main></body></html>`;
  }
  return `<!doctype html>
<html lang="gl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cadros2 - ${escapeHtml(PART_LABELS[safePart])}</title>
  <style>${css()}</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Imprimir / Gardar como PDF</button>
    <button onclick="window.close()">Pechar</button>
  </div>
  <main>
    <header>
      <div>
        <p class="eyebrow">Cadros2</p>
        <h1>${escapeHtml(PART_LABELS[safePart])}</h1>
        <p class="image-name">${escapeHtml(score.imageFile || '')}</p>
      </div>
      <div class="meta">
        <div>${escapeHtml(score.timestamp || '')}</div>
        <div>Seed ${escapeHtml(score.seed || '')}</div>
        <div>${escapeHtml(score.globalInstruction || '')}</div>
      </div>
    </header>
    ${featureSummary(score)}
    ${parts.map(part => renderPart(score, part)).join('')}
  </main>
  ${autoPrintScript}
</body>
</html>`;
}

module.exports = {
  renderPrintableHtml
};
