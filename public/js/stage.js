'use strict';

(function () {
  const stageStatus = document.getElementById('stageStatus');
  const stageImage = document.getElementById('stageImage');
  const featuresRoot = document.getElementById('features');
  const scoreRoot = document.getElementById('scoreRoot');

  function escapeHtml(value) {
    return window.ScoreRenderer.escapeHtml(value);
  }

  function renderImage(image) {
    if (!image) return;
    stageImage.src = image.url || `/images/${encodeURIComponent(image.file)}`;
    stageImage.alt = image.file || '';
    stageStatus.textContent = image.file || '';
  }

  function renderFeatures(analysis) {
    if (!analysis) return;
    const items = [
      ['luminancia', analysis.meanLum],
      ['contraste', analysis.contrast],
      ['calor', analysis.warmRatio],
      ['frio', analysis.coolRatio],
      ['bordes', analysis.edgeDensity],
      ['complexidade', analysis.complexity],
      ['pitch field', (analysis.pitchField || []).join(' ')],
      ['resumo', analysis.visualSummary || '']
    ];
    featuresRoot.innerHTML = items.map(([label, value]) => `<span><b>${escapeHtml(label)}</b>${escapeHtml(value ?? '-')}</span>`).join('');
  }

  function renderScore(score) {
    if (!score) return;
    renderImage({ file: score.imageFile, url: score.imageUrl });
    renderFeatures({ ...score.features, pitchField: score.pitchField, visualSummary: score.visualSummary });
    window.ScoreRenderer.renderScore(scoreRoot, score, 'all');
  }

  const socket = io({ transports: ['websocket', 'polling'], reconnectionDelay: 1000 });
  socket.on('connect', () => socket.emit('join-stage'));
  socket.on('state', state => {
    renderImage(state.selectedImage);
    if (state.lastAnalysis) renderFeatures(state.lastAnalysis);
    renderScore(state.lastScore);
  });
  socket.on('image-selected', renderImage);
  socket.on('analysis-update', ({ image, analysis }) => {
    renderImage(image);
    renderFeatures(analysis);
  });
  socket.on('score-draft', renderScore);
  socket.on('score-update', renderScore);
})();
