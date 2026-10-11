'use strict';

(function () {
  const partFromPath = (location.pathname.match(/\/performer\/([^/]+)/) || [])[1] || 'all';
  const part = ['piano', 'flute', 'viola', 'all'].includes(partFromPath) ? partFromPath : 'all';
  const labels = { piano: 'Piano', flute: 'Frauta', viola: 'Viola', all: 'Todas as partes' };
  const scoreRoot = document.getElementById('scoreRoot');
  const partTitle = document.getElementById('partTitle');
  const connectionState = document.getElementById('connectionState');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const printBtn = document.getElementById('printBtn');
  let lastScore = null;

  partTitle.textContent = labels[part];

  function render(score) {
    lastScore = score || lastScore;
    window.ScoreRenderer.renderScore(scoreRoot, lastScore, part);
    if (lastScore) {
      connectionState.textContent = `${lastScore.imageFile || ''} - seed ${lastScore.seed}`;
    }
  }

  fullscreenBtn.addEventListener('click', () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
  });

  printBtn.addEventListener('click', () => window.Cadros2Pdf.openPrint(part));

  const socket = io({ transports: ['websocket', 'polling'], reconnectionDelay: 1000 });
  socket.on('connect', () => {
    connectionState.textContent = 'conectado';
    socket.emit('join-performer', { part });
  });
  socket.on('disconnect', () => {
    connectionState.textContent = 'sen conexion';
  });
  socket.on('score-state', ({ current } = {}) => render(current));
  socket.on('score-update', score => render(score));
})();
