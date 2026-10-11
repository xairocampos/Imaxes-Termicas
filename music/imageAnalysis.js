'use strict';

const sharp = require('sharp');

function clamp(value, min = 0, max = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function hex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function centroid(sumX, sumY, weight) {
  if (!weight) return { x: 0.5, y: 0.5, weight: 0 };
  return { x: round(sumX / weight), y: round(sumY / weight), weight: round(weight) };
}

function emptyQuadrants() {
  return { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
}

function addQuadrant(q, x, y, weight) {
  if (x < 0.5 && y < 0.5) q.topLeft += weight;
  else if (x >= 0.5 && y < 0.5) q.topRight += weight;
  else if (x < 0.5 && y >= 0.5) q.bottomLeft += weight;
  else q.bottomRight += weight;
}

function normalizeQuadrants(q) {
  const total = q.topLeft + q.topRight + q.bottomLeft + q.bottomRight || 1;
  return {
    topLeft: round(q.topLeft / total),
    topRight: round(q.topRight / total),
    bottomLeft: round(q.bottomLeft / total),
    bottomRight: round(q.bottomRight / total)
  };
}

function entropyFromHistogram(hist, total) {
  let entropy = 0;
  for (const count of hist) {
    if (!count) continue;
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

async function analyzeImage(imagePath, options = {}) {
  const maxSize = options.maxSize || 360;
  const { data, info } = await sharp(imagePath)
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const total = width * height;
  const luminances = new Array(total);
  const lumHist = new Array(32).fill(0);
  const colorBins = new Map();
  const quadrants = emptyQuadrants();

  let sumLum = 0;
  let sumLum2 = 0;
  let warm = 0;
  let cool = 0;
  let green = 0;
  let dark = 0;
  let bright = 0;
  let satSum = 0;
  let warmX = 0; let warmY = 0; let warmW = 0;
  let coolX = 0; let coolY = 0; let coolW = 0;
  let brightX = 0; let brightY = 0; let brightW = 0;
  let darkX = 0; let darkY = 0; let darkW = 0;
  let energyTotal = 0;

  for (let i = 0, p = 0; i < data.length; i += 3, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const x = (p % width) / Math.max(1, width - 1);
    const y = Math.floor(p / width) / Math.max(1, height - 1);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const hsl = rgbToHsl(r, g, b);
    const saturation = hsl.s;
    const heatWeight = saturation * (0.35 + lum * 0.65);
    const coldWeight = saturation * (0.35 + (1 - lum) * 0.65);
    const energy = Math.abs(lum - 0.5) + saturation * 0.55;

    luminances[p] = lum;
    sumLum += lum;
    sumLum2 += lum * lum;
    satSum += saturation;
    lumHist[Math.min(31, Math.floor(lum * 32))]++;
    energyTotal += energy;
    addQuadrant(quadrants, x, y, energy);

    if ((hsl.h < 65 || hsl.h >= 335) && saturation > 0.18) {
      warm += heatWeight;
      warmX += x * heatWeight;
      warmY += y * heatWeight;
      warmW += heatWeight;
    }
    if (hsl.h >= 175 && hsl.h < 285 && saturation > 0.16) {
      cool += coldWeight;
      coolX += x * coldWeight;
      coolY += y * coldWeight;
      coolW += coldWeight;
    }
    if (hsl.h >= 75 && hsl.h < 165 && saturation > 0.16) green += heatWeight;
    if (lum < 0.24) {
      const w = 1 - lum;
      dark += w;
      darkX += x * w;
      darkY += y * w;
      darkW += w;
    }
    if (lum > 0.72) {
      const w = lum;
      bright += w;
      brightX += x * w;
      brightY += y * w;
      brightW += w;
    }

    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    const bin = colorBins.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bin.count++;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    colorBins.set(key, bin);
  }

  let edgeCount = 0;
  let horizontal = 0;
  let vertical = 0;
  let diagonal = 0;
  const edgeThreshold = 0.16;
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = y * width + x;
      const dx = Math.abs(luminances[idx] - luminances[idx + 1]);
      const dy = Math.abs(luminances[idx] - luminances[idx + width]);
      const gradient = Math.max(dx, dy);
      if (gradient > edgeThreshold) {
        edgeCount++;
        if (dx > dy * 1.35) vertical++;
        else if (dy > dx * 1.35) horizontal++;
        else diagonal++;
      }
    }
  }

  const sortedLum = luminances.slice().sort((a, b) => a - b);
  const meanLum = sumLum / total;
  const variance = Math.max(0, sumLum2 / total - meanLum * meanLum);
  const contrast = clamp(Math.sqrt(variance) * 2.8);
  const entropy = entropyFromHistogram(lumHist, total);
  const edgeDensity = edgeCount / Math.max(1, (width - 1) * (height - 1));
  const complexity = clamp((entropy / 5) * 0.42 + contrast * 0.31 + edgeDensity * 0.95 * 0.27);
  const dominantColors = [...colorBins.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 7)
    .map(bin => ({
      hex: hex(bin.r / bin.count, bin.g / bin.count, bin.b / bin.count),
      ratio: round(bin.count / total)
    }));
  const orientationTotal = horizontal + vertical + diagonal || 1;

  return {
    width,
    height,
    meanLum: round(meanLum),
    contrast: round(contrast),
    luminancePercentiles: {
      p5: round(percentile(sortedLum, 0.05)),
      p15: round(percentile(sortedLum, 0.15)),
      p30: round(percentile(sortedLum, 0.30)),
      p50: round(percentile(sortedLum, 0.50)),
      p70: round(percentile(sortedLum, 0.70)),
      p85: round(percentile(sortedLum, 0.85)),
      p95: round(percentile(sortedLum, 0.95))
    },
    dominantColors,
    colorHistogram: dominantColors,
    warmRatio: round(warm / total),
    coolRatio: round(cool / total),
    greenRatio: round(green / total),
    darkRatio: round(dark / total),
    brightRatio: round(bright / total),
    saturation: round(satSum / total),
    edgeDensity: round(edgeDensity),
    orientationTendency: {
      horizontal: round(horizontal / orientationTotal),
      vertical: round(vertical / orientationTotal),
      diagonal: round(diagonal / orientationTotal)
    },
    centroidWarm: centroid(warmX, warmY, warmW),
    centroidCool: centroid(coolX, coolY, coolW),
    centroidBright: centroid(brightX, brightY, brightW),
    centroidDark: centroid(darkX, darkY, darkW),
    quadrantDensity: normalizeQuadrants(quadrants),
    entropy: round(entropy),
    complexity: round(complexity),
    thermalProfile: {
      warmDominance: round(warm / Math.max(1, warm + cool)),
      coolDominance: round(cool / Math.max(1, warm + cool)),
      heatCenterY: round(centroid(warmX, warmY, warmW).y),
      coldCenterY: round(centroid(coolX, coolY, coolW).y)
    }
  };
}

module.exports = {
  analyzeImage
};
