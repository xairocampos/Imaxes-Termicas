'use strict';

const fs = require('fs');
const path = require('path');
const { renderPrintableHtml } = require('./pdfGenerator');

function safeName(value, fallback = 'score') {
  return String(value || fallback)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 90) || fallback;
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/\.\d+Z$/, '').replace(/[:T]/g, '-');
}

function saveScoreArchive(score, imagePath, archiveRoot) {
  const root = archiveRoot || path.join(__dirname, '..', 'archive');
  fs.mkdirSync(root, { recursive: true });
  const dirName = `${safeName(score.imageFile)}_${timestampSlug(new Date(score.timestamp || Date.now()))}_seed-${score.seed}`;
  const dir = path.join(root, dirName);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'score.json'), JSON.stringify(score, null, 2));
  fs.writeFileSync(path.join(dir, 'analysis.json'), JSON.stringify(score.features || {}, null, 2));

  for (const part of ['piano', 'flute', 'viola', 'all']) {
    fs.writeFileSync(path.join(dir, `${part}.html`), renderPrintableHtml(score, part));
  }

  if (imagePath && fs.existsSync(imagePath)) {
    const ext = path.extname(imagePath) || '.jpg';
    fs.copyFileSync(imagePath, path.join(dir, `image${ext}`));
  }

  return {
    id: dirName,
    dir,
    files: {
      score: path.join(dir, 'score.json'),
      analysis: path.join(dir, 'analysis.json')
    }
  };
}

function listArchive(archiveRoot) {
  const root = archiveRoot || path.join(__dirname, '..', 'archive');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const dir = path.join(root, entry.name);
      const scoreFile = path.join(dir, 'score.json');
      let score = null;
      try {
        if (fs.existsSync(scoreFile)) score = JSON.parse(fs.readFileSync(scoreFile, 'utf8'));
      } catch (_) {
        score = null;
      }
      return {
        id: entry.name,
        imageFile: score?.imageFile || '',
        timestamp: score?.timestamp || '',
        seed: score?.seed || '',
        visualSummary: score?.visualSummary || ''
      };
    })
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

module.exports = {
  saveScoreArchive,
  listArchive
};
