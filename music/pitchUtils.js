'use strict';

const BASE_FIELD = ['D', 'E', 'F#', 'G', 'A', 'C'];

function clamp(value, min = 0, max = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function uniq(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function rotate(list, offset) {
  const arr = list || [];
  if (!arr.length) return [];
  const n = ((offset % arr.length) + arr.length) % arr.length;
  return arr.slice(n).concat(arr.slice(0, n));
}

function hashString(value) {
  let hash = 2166136261;
  const str = String(value || '');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let t = (Number(seed) || 1) >>> 0;
  return function rng() {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function choice(list, rng) {
  if (!list.length) return null;
  return list[Math.floor(rng() * list.length) % list.length];
}

function chooseMany(list, count, rng) {
  const pool = rotate(uniq(list), Math.floor(rng() * Math.max(1, list.length)));
  const picked = [];
  for (const item of pool) {
    if (picked.length >= count) break;
    picked.push(item);
  }
  while (picked.length < count && pool.length) picked.push(choice(pool, rng));
  return picked;
}

function addOctaves(notes, octaves, seed = 0) {
  return notes.map((note, index) => `${note}${octaves[(index + seed) % octaves.length]}`);
}

function chord(notes, octaves, size, seed = 0) {
  const rotated = rotate(notes, seed);
  const out = [];
  for (let i = 0; i < size; i++) {
    out.push(`${rotated[i % rotated.length]}${octaves[(i + seed) % octaves.length]}`);
  }
  return uniq(out);
}

function derivePitchField(features = {}, config = {}, seed = 1) {
  const base = Array.isArray(config.pitchFieldBase) && config.pitchFieldBase.length
    ? config.pitchFieldBase
    : BASE_FIELD;
  const weighted = [];

  if (features.warmRatio > 0.18) weighted.push('D', 'F#', 'A', 'C');
  if (features.coolRatio > 0.18) weighted.push('E', 'G', 'A', 'C');
  if (features.greenRatio > 0.12) weighted.push('D', 'G', 'A');
  if (features.darkRatio > 0.22) weighted.push('D', 'C', 'E');
  if (features.brightRatio > 0.22) weighted.push('F#', 'A', 'C');
  if (features.contrast > 0.55) weighted.push('D', 'C', 'F#', 'A');

  const rng = createRng(seed);
  const merged = uniq([...weighted, ...base]).filter(note => base.includes(note));
  return rotate(merged.length ? merged : base, Math.floor(rng() * base.length));
}

module.exports = {
  BASE_FIELD,
  clamp,
  uniq,
  rotate,
  hashString,
  createRng,
  choice,
  chooseMany,
  addOctaves,
  chord,
  derivePitchField
};
