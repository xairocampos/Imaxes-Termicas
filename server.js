'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const config = require('./music/config.json');
const { analyzeImage } = require('./music/imageAnalysis');
const { generateScore } = require('./music/scoreGenerator');
const scoreState = require('./music/scoreState');
const { renderPrintableHtml } = require('./music/pdfGenerator');
const { saveScoreArchive, listArchive } = require('./music/archive');

const PORT = Number(process.env.PORT || config.port || 3001);
const ROOT = __dirname;
const ARCHIVE_DIR = path.join(ROOT, 'archive');
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const IMAGE_DIR_CANDIDATES = [
  path.join(ROOT, 'termica'),
  path.join(ROOT, '..', 'Cadros', 'termica'),
  path.join(ROOT, '..', 'termica')
];

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 10000
});

app.use(express.json({ limit: '2mb' }));

function safeFileName(value) {
  const name = path.basename(String(value || ''));
  return IMAGE_EXTS.has(path.extname(name).toLowerCase()) ? name : '';
}

function getImageDir() {
  return IMAGE_DIR_CANDIDATES.find(dir => {
    try {
      return fs.existsSync(dir) && fs.readdirSync(dir).some(file => IMAGE_EXTS.has(path.extname(file).toLowerCase()));
    } catch (_) {
      return false;
    }
  }) || IMAGE_DIR_CANDIDATES[0];
}

function listImages() {
  const dir = getImageDir();
  if (!fs.existsSync(dir)) return { dir, images: [], warning: 'Non existe a carpeta termica.' };
  const images = fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && IMAGE_EXTS.has(path.extname(entry.name).toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry, index) => {
      const stat = fs.statSync(path.join(dir, entry.name));
      return {
        id: `termica_${String(index + 1).padStart(2, '0')}`,
        file: entry.name,
        url: `/images/${encodeURIComponent(entry.name)}`,
        size: stat.size
      };
    });
  const warning = images.length > 5 ? `Hai ${images.length} imaxes. Mostranse todas.` : '';
  return { dir, images, warning };
}

function getImagePath(file) {
  const safe = safeFileName(file);
  if (!safe) return null;
  const full = path.join(getImageDir(), safe);
  if (!fs.existsSync(full)) return null;
  return full;
}

function publicState() {
  return {
    ...scoreState.getState(),
    images: listImages().images
  };
}

function emitScore(score) {
  if (!score) return;
  io.to('performers').emit('score-update', score);
  io.to('stage').emit('score-update', score);
  io.to('admin').emit('score-update', score);
  io.to('control').emit('score-update', score);
}

app.get('/', (_req, res) => res.redirect('/control'));
app.get('/control', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'control.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'admin.html')));
app.get('/stage', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'stage.html')));
app.get('/performer/:part', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'performer.html')));
app.get('/all', (_req, res) => res.redirect('/performer/all'));

app.get('/images/:file', (req, res) => {
  const imagePath = getImagePath(req.params.file);
  if (!imagePath) return res.status(404).send('Imaxe non atopada');
  res.sendFile(imagePath);
});

app.get('/api/images', (_req, res) => {
  const data = listImages();
  res.json({
    images: data.images,
    count: data.images.length,
    sourceDir: data.dir,
    warning: data.warning || (data.images.length ? '' : 'Non hai imaxes en termica/.')
  });
});

app.get('/api/state', (_req, res) => {
  res.json(publicState());
});

app.post('/api/select', (req, res) => {
  const file = safeFileName(req.body?.imageFile);
  const image = listImages().images.find(item => item.file === file);
  if (!image) return res.status(404).json({ error: 'Imaxe non atopada' });
  scoreState.setSelectedImage(image);
  io.to('stage').emit('image-selected', image);
  io.to('control').emit('image-selected', image);
  res.json({ ok: true, image });
});

app.post('/api/analyze', async (req, res) => {
  const file = safeFileName(req.body?.imageFile);
  const imagePath = getImagePath(file);
  if (!imagePath) return res.status(404).json({ error: 'Imaxe non atopada' });
  try {
    const analysis = await analyzeImage(imagePath);
    const image = listImages().images.find(item => item.file === file) || { file, url: `/images/${encodeURIComponent(file)}` };
    scoreState.setAnalysis(image, analysis);
    io.to('stage').emit('analysis-update', { image, analysis });
    io.to('admin').emit('analysis-update', { image, analysis });
    res.json({ ok: true, image, analysis });
  } catch (err) {
    console.error('[ANALYZE]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate', async (req, res) => {
  const file = safeFileName(req.body?.imageFile);
  const imagePath = getImagePath(file);
  if (!imagePath) return res.status(404).json({ error: 'Imaxe non atopada' });
  try {
    const analysis = await analyzeImage(imagePath);
    const image = listImages().images.find(item => item.file === file) || { id: file, file, url: `/images/${encodeURIComponent(file)}` };
    const seed = Number(req.body?.seed) || Math.floor(Math.random() * 1_000_000_000);
    const score = generateScore(analysis, {
      id: `${image.id}_${seed}`,
      imageFile: image.file,
      imageUrl: image.url,
      seed,
      durationSeconds: req.body?.durationSeconds
    }, config);
    const archive = saveScoreArchive(score, imagePath, ARCHIVE_DIR);
    score.archive = { id: archive.id };
    scoreState.setAnalysis(image, analysis);
    scoreState.setScore(score);
    io.to('stage').emit('score-draft', score);
    io.to('admin').emit('score-draft', score);
    io.to('control').emit('score-draft', score);
    res.json({ ok: true, image, analysis, score, archive });
  } catch (err) {
    console.error('[GENERATE]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/send', (_req, res) => {
  const state = scoreState.getState();
  if (!state.lastScore) return res.status(404).json({ error: 'Non hai partitura xerada' });
  const lastSentAt = scoreState.markSent();
  emitScore(state.lastScore);
  res.json({ ok: true, lastSentAt, score: state.lastScore });
});

app.post('/api/archive-analysis', (req, res) => {
  const state = scoreState.getState();
  const file = safeFileName(req.body?.imageFile || state.selectedImage?.file || state.lastScore?.imageFile);
  if (!state.lastAnalysis) return res.status(404).json({ error: 'Non hai análise para gardar' });
  const dirName = `analysis_${String(file || 'image').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_')}_${new Date().toISOString().replace(/\.\d+Z$/, '').replace(/[:T]/g, '-')}`;
  const dir = path.join(ARCHIVE_DIR, dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'analysis.json'), JSON.stringify(state.lastAnalysis, null, 2));
  const imagePath = getImagePath(file);
  if (imagePath) fs.copyFileSync(imagePath, path.join(dir, `image${path.extname(imagePath)}`));
  res.json({ ok: true, archive: { id: dirName, dir } });
});

app.get('/api/archive', (_req, res) => {
  res.json({ items: listArchive(ARCHIVE_DIR) });
});

app.get('/print/:part', (req, res) => {
  const state = scoreState.getState();
  const html = renderPrintableHtml(state.lastScore, req.params.part, {
    autoPrint: req.query.autoprint === '1'
  });
  res.setHeader('Cache-Control', 'no-cache');
  res.send(html);
});

app.use(express.static(path.join(ROOT, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

io.on('connection', socket => {
  console.log(`[+] ${socket.id} conectado`);
  socket.emit('state', publicState());

  socket.on('join-control', () => {
    socket.join('control');
    socket.emit('state', publicState());
  });

  socket.on('join-admin', () => {
    socket.join('admin');
    socket.emit('state', publicState());
  });

  socket.on('join-stage', () => {
    socket.join('stage');
    socket.emit('state', publicState());
  });

  socket.on('join-performer', ({ part } = {}) => {
    const safePart = ['piano', 'flute', 'viola', 'all'].includes(part) ? part : 'all';
    socket.join('performers');
    socket.data.part = safePart;
    socket.emit('score-state', {
      current: scoreState.getState().lastScore,
      part: safePart
    });
  });

  socket.on('disconnect', reason => {
    console.log(`[-] ${socket.id} desconectado: ${reason}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\nCADROS2 activo');
  console.log(`Control : http://localhost:${PORT}/control`);
  console.log(`Piano   : http://localhost:${PORT}/performer/piano`);
  console.log(`Frauta  : http://localhost:${PORT}/performer/flute`);
  console.log(`Viola   : http://localhost:${PORT}/performer/viola`);
  console.log(`Todas   : http://localhost:${PORT}/performer/all`);
  console.log(`Stage   : http://localhost:${PORT}/stage`);
  console.log(`Admin   : http://localhost:${PORT}/admin\n`);
});

function shutdown(signal) {
  console.log(`\n[${signal}] Pechando Cadros2...`);
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
