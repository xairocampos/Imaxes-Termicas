'use strict';

const {
  clamp,
  rotate,
  hashString,
  createRng,
  chooseMany,
  addOctaves,
  chord,
  derivePitchField
} = require('./pitchUtils');

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function modeLabel(mode) {
  return {
    sonorities: 'sonoridades',
    constellations: 'constelacions',
    pedals: 'pedais',
    lines: 'linas',
    long_tones: 'notas longas',
    repeated_cells: 'celulas repetibles',
    air: 'aire'
  }[mode] || mode;
}

function notesByAspect(features, pitchField) {
  const notes = [];
  if (features.warmRatio > 0.14) notes.push('D', 'F#', 'A', 'C');
  if (features.coolRatio > 0.14) notes.push('E', 'G', 'A', 'C');
  if (features.greenRatio > 0.10) notes.push('D', 'G', 'A');
  if (features.darkRatio > 0.18) notes.push('D', 'C', 'E');
  if (features.brightRatio > 0.18) notes.push('F#', 'A', 'C');
  for (const note of pitchField) notes.push(note);
  return [...new Set(notes.filter(note => pitchField.includes(note)))];
}

function buildPiano(features, pitchField, rng, seed) {
  const structuralNotes = notesByAspect(features, pitchField);
  const hotHigh = features.warmRatio > features.coolRatio || features.brightRatio > 0.28;
  const coldLow = features.coolRatio > features.warmRatio || features.darkRatio > 0.24;
  const contrast = features.contrast || 0;
  const complexity = features.complexity || 0;
  const sonorityCount = 2 + Math.round(clamp(complexity, 0, 1) * 3);
  const chordSize = contrast > 0.58 ? 4 : (complexity > 0.45 ? 3 : 2);
  const octaves = coldLow
    ? [2, 3, 3, 4]
    : (hotHigh ? [3, 4, 5, 5] : [3, 4, 4, 5]);
  const notes = [];

  for (let i = 0; i < sonorityCount; i++) {
    notes.push(chord(structuralNotes, octaves, chordSize, seed + i * 2 + Math.floor(rng() * 5)));
  }

  const cellSource = chooseMany(structuralNotes, 4, rng);
  const cells = complexity > 0.52
    ? [addOctaves(cellSource, hotHigh ? [4, 5, 5, 6] : [3, 4, 4, 5], seed)]
    : [];

  return {
    title: 'Piano',
    duration: `${features.durationSeconds || 30} s`,
    mode: complexity > 0.55 ? 'sonorities' : 'constellations',
    modeLabel: modeLabel(complexity > 0.55 ? 'sonorities' : 'constellations'),
    notes,
    cells,
    dynamics: features.darkRatio > 0.34 ? 'pp' : (complexity > 0.62 ? 'mp' : 'p'),
    register: coldLow ? 'grave/medio' : (hotHigh ? 'medio/agudo' : 'medio'),
    technique: features.brightRatio > 0.32 ? 'pedal claro, resonante' : 'pedal curto ou medio',
    instruction: contrast > 0.58
      ? 'Acordes lentos con separacion. Deixar que cada sonoridade respire antes da seguinte.'
      : 'Acordes lentos ou constelacions. Repetir libremente, sen pulso obrigatorio.'
  };
}

function buildFlute(features, pitchField, rng, seed) {
  const edge = features.edgeDensity || 0;
  const contrast = features.contrast || 0;
  const bright = features.brightRatio || 0;
  const cool = features.coolRatio || 0;
  const source = [];
  if (cool > 0.16) source.push('E', 'G', 'A', 'C');
  if (bright > 0.22) source.push('F#', 'A', 'C');
  if (edge > 0.13) source.push('E', 'F#', 'G', 'A');
  for (const note of pitchField) source.push(note);

  const count = edge > 0.20 || contrast > 0.62 ? 6 : (edge > 0.11 ? 4 : 2);
  const notes = addOctaves(
    chooseMany([...new Set(source.filter(note => pitchField.includes(note)))], count, rng),
    bright > 0.30 ? [5, 6, 6] : [5, 5, 6],
    seed
  );
  const cellLength = edge > 0.16 ? 4 : 3;
  const cells = edge > 0.10
    ? [rotate(notes, seed).slice(0, Math.min(cellLength, notes.length))]
    : [];

  return {
    title: 'Frauta',
    duration: `${features.durationSeconds || 30} s`,
    mode: edge > 0.12 ? 'lines' : 'long_tones',
    modeLabel: modeLabel(edge > 0.12 ? 'lines' : 'long_tones'),
    notes,
    cells,
    dynamics: contrast > 0.58 ? 'p/mp' : 'pp/p',
    register: bright > 0.30 ? 'agudo' : 'medio/agudo',
    technique: contrast > 0.62 ? 'ordinario, incisos con aire ao final' : 'sen vibrato, aire opcional',
    instruction: edge > 0.14
      ? 'Notas longas interrompidas por incisos curtos. Repetir a celula se aparece movemento.'
      : 'Unha ou varias notas longas. Entrar libremente e deixar moito silencio.'
  };
}

function buildViola(features, pitchField, rng, seed) {
  const dark = features.darkRatio || 0;
  const cool = features.coolRatio || 0;
  const density = features.complexity || 0;
  const source = [];
  if (dark > 0.14) source.push('D', 'C', 'E');
  if (cool > 0.15) source.push('E', 'G', 'A', 'C');
  if (features.greenRatio > 0.10) source.push('D', 'G', 'A');
  for (const note of pitchField) source.push(note);

  const count = density > 0.62 ? 5 : (dark > 0.24 || cool > 0.28 ? 4 : 2);
  const notes = addOctaves(
    chooseMany([...new Set(source.filter(note => pitchField.includes(note)))], count, rng),
    dark > 0.24 ? [3, 3, 4] : [3, 4, 4],
    seed
  );
  const cells = density > 0.56 ? [rotate(notes, seed + 1).slice(0, Math.min(3, notes.length))] : [];
  const doubleStops = dark > 0.25 && notes.length >= 2 ? [[notes[0], notes[1]]] : [];

  return {
    title: 'Viola',
    duration: `${features.durationSeconds || 30} s`,
    mode: cells.length ? 'repeated_cells' : 'pedals',
    modeLabel: modeLabel(cells.length ? 'repeated_cells' : 'pedals'),
    notes,
    cells,
    doubleStops,
    dynamics: dark > 0.32 ? 'pp' : 'p',
    register: dark > 0.28 ? 'grave/medio' : 'medio',
    technique: dark > 0.30 ? 'sul ponticello moi lixeiro' : 'sul tasto, moi suave',
    instruction: cells.length
      ? 'Pedais longos con pequenas celulas repetidas, sempre sen sincronizar co piano.'
      : 'Pedais longos. Cambiar de nota lentamente, como unha zona fria que se despraza.'
  };
}

function buildSummary(features) {
  const qualities = [];
  if (features.warmRatio > features.coolRatio) qualities.push('calor dominante');
  if (features.coolRatio > features.warmRatio) qualities.push('frio dominante');
  if (features.contrast > 0.58) qualities.push('contraste alto');
  if (features.edgeDensity > 0.16) qualities.push('moitos bordes');
  if (features.complexity < 0.36) qualities.push('gradiente suave');
  if (!qualities.length) qualities.push('equilibrio cromatico');
  return qualities.join(', ');
}

function generateScore(features, meta = {}, config = {}) {
  const baseSeed = Number(meta.seed) || hashString(`${meta.imageFile || ''}-${Date.now()}`);
  const rng = createRng(baseSeed);
  const durationSeconds = meta.durationSeconds || config.cycleSeconds || (features.complexity > 0.62 ? 40 : 30);
  const enrichedFeatures = {
    ...features,
    durationSeconds
  };
  const pitchField = derivePitchField(enrichedFeatures, config, baseSeed);
  const seedShift = Math.floor(rng() * 31);

  const score = {
    id: meta.id || `score_${baseSeed}`,
    imageFile: meta.imageFile || '',
    imageUrl: meta.imageUrl || '',
    timestamp: new Date().toISOString(),
    seed: baseSeed,
    duration: durationSeconds,
    pitchField,
    features: enrichedFeatures,
    visualSummary: buildSummary(enrichedFeatures),
    globalInstruction: `Modulo libre de ${durationSeconds} segundos. Non e necesario sincronizar entradas.`,
    parts: {
      piano: buildPiano(enrichedFeatures, pitchField, rng, seedShift),
      flute: buildFlute(enrichedFeatures, pitchField, rng, seedShift + 5),
      viola: buildViola(enrichedFeatures, pitchField, rng, seedShift + 11)
    }
  };

  score.features.pitchField = pitchField;
  score.features.complexity = round(score.features.complexity);
  return score;
}

module.exports = {
  generateScore
};
