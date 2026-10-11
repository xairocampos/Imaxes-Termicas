'use strict';

(function () {
  const PART_LABELS = {
    piano: 'Piano',
    flute: 'Frauta',
    viola: 'Viola'
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function flatNotes(notes) {
    if (!Array.isArray(notes)) return [];
    return notes.flatMap(item => Array.isArray(item) ? item : [item]).filter(Boolean);
  }

  function renderPiano(notes) {
    if (!Array.isArray(notes) || !notes.length) return '<div class="notes-list"><span class="note-token">silencio</span></div>';
    return `<div class="chord-list">${notes.map((item, index) => {
      const chordNotes = Array.isArray(item) ? item : [item];
      return `
        <div class="chord-row">
          <span class="chord-label">Acorde ${index + 1}</span>
          <span class="chord-notes">${chordNotes.map(note => `<b>${escapeHtml(note)}</b>`).join('')}</span>
        </div>
      `;
    }).join('')}</div>`;
  }

  function renderNotes(notes) {
    const flat = flatNotes(notes);
    if (!flat.length) return '<div class="notes-list"><span class="note-token">silencio / aire</span></div>';
    return `<div class="notes-list">${flat.map(note => `<span class="note-token">${escapeHtml(note)}</span>`).join('')}</div>`;
  }

  function renderCells(part) {
    if (!part?.cells?.length) return '';
    return `<div class="cells"><strong>Celulas:</strong> ${part.cells.map(cell => escapeHtml(cell.join(' - '))).join(' / ')}</div>`;
  }

  function renderPart(score, name) {
    const part = score.parts?.[name];
    if (!part) return '';
    return `
      <article class="part">
        <div class="part-head">
          <h2>${escapeHtml(part.title || PART_LABELS[name] || name)}</h2>
          <span>${escapeHtml(part.modeLabel || part.mode || '')}</span>
        </div>
        <div class="notation-label">${name === 'piano' ? 'Acordes' : 'Notas'}</div>
        ${name === 'piano' ? renderPiano(part.notes) : renderNotes(part.notes)}
        ${renderCells(part)}
        <div class="part-info">
          <span>${escapeHtml(part.duration || `${score.duration || 30} s`)}</span>
          <span>${escapeHtml(part.dynamics || '')}</span>
          <span>${escapeHtml(part.register || '')}</span>
          <span>${escapeHtml(part.technique || '')}</span>
        </div>
        <p class="instruction">${escapeHtml(part.instruction || '')}</p>
      </article>
    `;
  }

  function featureMeta(score) {
    const f = score.features || {};
    const items = [
      ['foto', score.imageFile],
      ['duracion', `${score.duration || 30} s`],
      ['pitch field', (score.pitchField || []).join(' ')],
      ['imaxe', score.visualSummary || '']
    ];
    return `<div class="score-meta">${items.map(([label, value]) => `<span><b>${escapeHtml(label)}</b>${escapeHtml(value ?? '-')}</span>`).join('')}</div>`;
  }

  function renderScore(container, score, part = 'all') {
    if (!container) return;
    if (!score) {
      container.className = 'score-root empty';
      container.innerHTML = '<p>Agardando partitura.</p>';
      return;
    }
    const parts = part === 'all' ? ['piano', 'flute', 'viola'] : [part];
    container.className = 'score-root';
    container.innerHTML = `
      <div class="score-intro">
        <div>
          <p class="eyebrow">Cadros2</p>
          <h2>${escapeHtml(part === 'all' ? 'Todas as partes' : PART_LABELS[part])}</h2>
        </div>
        <p>${escapeHtml(score.globalInstruction || '')}</p>
      </div>
      ${featureMeta(score)}
      <div class="parts-grid ${part === 'all' ? 'all' : 'single'}">
        ${parts.map(name => renderPart(score, name)).join('')}
      </div>
    `;
  }

  window.ScoreRenderer = {
    renderScore,
    escapeHtml
  };
})();
