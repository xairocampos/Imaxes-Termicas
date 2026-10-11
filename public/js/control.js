'use strict';

(function () {
  const gallery = document.getElementById('gallery');
  const warning = document.getElementById('warning');
  const imageCount = document.getElementById('imageCount');
  const selectedTitle = document.getElementById('selectedTitle');
  const selectedImage = document.getElementById('selectedImage');
  const statusLine = document.getElementById('statusLine');
  const scoreStatus = document.getElementById('scoreStatus');
  const featuresRoot = document.getElementById('features');
  const swatchesRoot = document.getElementById('swatches');
  const scoreRoot = document.getElementById('scoreRoot');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const generateBtn = document.getElementById('generateBtn');
  const newSeedBtn = document.getElementById('newSeedBtn');
  const sendBtn = document.getElementById('sendBtn');
  const saveAnalysisBtn = document.getElementById('saveAnalysisBtn');

  let images = [];
  let selected = null;
  let lastAnalysis = null;
  let lastScore = null;

  function setBusy(text) {
    statusLine.textContent = text || '';
  }

  function setScoreStatus(text) {
    scoreStatus.textContent = text || '';
  }

  function escapeHtml(value) {
    return window.ScoreRenderer.escapeHtml(value);
  }

  function renderGallery() {
    imageCount.textContent = images.length ? `${images.length} fotos` : '0 fotos';
    if (!images.length) {
      gallery.innerHTML = '<div class="empty">Non hai imaxes en termica/.</div>';
      return;
    }
    gallery.innerHTML = images.map(image => `
      <button class="thumb ${selected?.file === image.file ? 'selected' : ''}" data-file="${escapeHtml(image.file)}">
        <img src="${image.url}" alt="${escapeHtml(image.file)}">
        <span>${escapeHtml(image.file)}</span>
      </button>
    `).join('');
    gallery.querySelectorAll('.thumb').forEach(btn => {
      btn.addEventListener('click', () => selectImage(btn.dataset.file));
    });
  }

  function selectImage(file) {
    selected = images.find(image => image.file === file);
    if (!selected) return;
    selectedTitle.textContent = selected.file;
    selectedImage.src = selected.url;
    selectedImage.alt = selected.file;
    lastAnalysis = null;
    lastScore = null;
    featuresRoot.innerHTML = '';
    swatchesRoot.innerHTML = '';
    window.ScoreRenderer.renderScore(scoreRoot, null, 'all');
    renderGallery();
    window.Cadros2Api.select(selected.file).catch(err => setBusy(err.message));
  }

  function featureItems(analysis) {
    if (!analysis) return [];
    return [
      ['luminancia', analysis.meanLum],
      ['contraste', analysis.contrast],
      ['p5/p95', `${analysis.luminancePercentiles?.p5} / ${analysis.luminancePercentiles?.p95}`],
      ['calor', analysis.warmRatio],
      ['frio', analysis.coolRatio],
      ['verde', analysis.greenRatio],
      ['escuro', analysis.darkRatio],
      ['brillo', analysis.brightRatio],
      ['bordes', analysis.edgeDensity],
      ['complexidade', analysis.complexity],
      ['centro calor', `${analysis.centroidWarm?.x}, ${analysis.centroidWarm?.y}`],
      ['centro frio', `${analysis.centroidCool?.x}, ${analysis.centroidCool?.y}`],
      ['orient. H', analysis.orientationTendency?.horizontal],
      ['orient. V', analysis.orientationTendency?.vertical],
      ['pitch field', (analysis.pitchField || lastScore?.pitchField || []).join(' ')]
    ];
  }

  function renderAnalysis(analysis) {
    lastAnalysis = analysis;
    featuresRoot.innerHTML = featureItems(analysis).map(([label, value]) => (
      `<span><b>${escapeHtml(label)}</b>${escapeHtml(value ?? '-')}</span>`
    )).join('');
    swatchesRoot.innerHTML = (analysis?.dominantColors || []).map(color => (
      `<span class="swatch" style="background:${escapeHtml(color.hex)}" title="${escapeHtml(color.hex)}"></span>`
    )).join('');
  }

  async function analyze() {
    if (!selected) return setBusy('Selecciona unha foto.');
    setBusy('Analizando...');
    try {
      const data = await window.Cadros2Api.analyze(selected.file);
      renderAnalysis(data.analysis);
      setBusy('Analise lista.');
    } catch (err) {
      setBusy(err.message);
    }
  }

  async function generate(seed) {
    if (!selected) return setBusy('Selecciona unha foto.');
    setBusy('Xerando partitura...');
    try {
      const data = await window.Cadros2Api.generate(selected.file, seed);
      lastAnalysis = data.analysis;
      lastScore = data.score;
      renderAnalysis({ ...data.analysis, pitchField: data.score.pitchField });
      window.ScoreRenderer.renderScore(scoreRoot, data.score, 'all');
      setBusy('Partitura xerada.');
      setScoreStatus(`Seed ${data.score.seed}`);
    } catch (err) {
      setBusy(err.message);
    }
  }

  async function send() {
    try {
      const data = await window.Cadros2Api.send();
      setScoreStatus(`Enviado ${new Date(data.lastSentAt).toLocaleTimeString()}`);
    } catch (err) {
      setScoreStatus(err.message);
    }
  }

  async function saveAnalysis() {
    if (!selected) return setBusy('Selecciona unha foto.');
    try {
      await window.Cadros2Api.archiveAnalysis(selected.file);
      setBusy('Analise gardada.');
    } catch (err) {
      setBusy(err.message);
    }
  }

  analyzeBtn.addEventListener('click', analyze);
  generateBtn.addEventListener('click', () => generate());
  newSeedBtn.addEventListener('click', () => generate(Math.floor(Math.random() * 1_000_000_000)));
  sendBtn.addEventListener('click', send);
  saveAnalysisBtn.addEventListener('click', saveAnalysis);
  document.querySelectorAll('[data-print]').forEach(btn => {
    btn.addEventListener('click', () => window.Cadros2Pdf.openPrint(btn.dataset.print));
  });

  const socket = io({ transports: ['websocket', 'polling'], reconnectionDelay: 1000 });
  socket.on('connect', () => socket.emit('join-control'));
  socket.on('score-draft', score => {
    lastScore = score;
    renderAnalysis({ ...score.features, pitchField: score.pitchField });
    window.ScoreRenderer.renderScore(scoreRoot, score, 'all');
  });
  socket.on('score-update', score => {
    lastScore = score;
    window.ScoreRenderer.renderScore(scoreRoot, score, 'all');
    setScoreStatus('Enviado ás tablets.');
  });

  async function init() {
    try {
      const data = await window.Cadros2Api.images();
      images = data.images || [];
      warning.textContent = data.warning || '';
      renderGallery();
      if (images[0]) selectImage(images[0].file);
    } catch (err) {
      warning.textContent = err.message;
    }
  }

  init();
})();
