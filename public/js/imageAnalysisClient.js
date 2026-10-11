'use strict';

(function () {
  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  window.Cadros2Api = {
    images: () => requestJson('/api/images'),
    state: () => requestJson('/api/state'),
    select: imageFile => requestJson('/api/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageFile })
    }),
    analyze: imageFile => requestJson('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageFile })
    }),
    generate: (imageFile, seed) => requestJson('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageFile, seed })
    }),
    send: () => requestJson('/api/send', { method: 'POST' }),
    archiveAnalysis: imageFile => requestJson('/api/archive-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageFile })
    }),
    archive: () => requestJson('/api/archive')
  };
})();
