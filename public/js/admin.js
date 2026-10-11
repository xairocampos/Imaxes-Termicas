'use strict';

(function () {
  const adminStatus = document.getElementById('adminStatus');
  const stateGrid = document.getElementById('stateGrid');
  const archiveList = document.getElementById('archiveList');
  const scoreRoot = document.getElementById('scoreRoot');
  const refreshArchive = document.getElementById('refreshArchive');

  function escapeHtml(value) {
    return window.ScoreRenderer.escapeHtml(value);
  }

  function renderState(state) {
    const score = state.lastScore;
    const items = [
      ['imaxes', state.images?.length || 0],
      ['seleccionada', state.selectedImage?.file || '-'],
      ['último score', score?.id || '-'],
      ['seed', score?.seed || '-'],
      ['enviado', state.lastSentAt ? new Date(state.lastSentAt).toLocaleString() : '-'],
      ['arquivo', score?.archive?.id || '-']
    ];
    stateGrid.innerHTML = items.map(([label, value]) => `<span><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`).join('');
    window.ScoreRenderer.renderScore(scoreRoot, score, 'all');
  }

  async function loadArchive() {
    const data = await window.Cadros2Api.archive();
    const items = data.items || [];
    archiveList.innerHTML = items.length ? items.map(item => `
      <div class="archive-item">
        <b>${escapeHtml(item.imageFile || item.id)}</b>
        <div>${escapeHtml(item.timestamp || '')}</div>
        <div>Seed ${escapeHtml(item.seed || '')}</div>
        <div>${escapeHtml(item.visualSummary || '')}</div>
      </div>
    `).join('') : '<div class="empty">Arquivo baleiro.</div>';
  }

  refreshArchive.addEventListener('click', loadArchive);
  document.querySelectorAll('[data-print]').forEach(btn => {
    btn.addEventListener('click', () => window.Cadros2Pdf.openPrint(btn.dataset.print));
  });

  const socket = io({ transports: ['websocket', 'polling'], reconnectionDelay: 1000 });
  socket.on('connect', () => {
    adminStatus.textContent = 'conectado';
    socket.emit('join-admin');
  });
  socket.on('disconnect', () => {
    adminStatus.textContent = 'sen conexion';
  });
  socket.on('state', state => renderState(state));
  socket.on('score-draft', score => window.ScoreRenderer.renderScore(scoreRoot, score, 'all'));
  socket.on('score-update', score => window.ScoreRenderer.renderScore(scoreRoot, score, 'all'));

  window.Cadros2Api.state().then(renderState).catch(err => {
    adminStatus.textContent = err.message;
  });
  loadArchive().catch(() => {});
})();
