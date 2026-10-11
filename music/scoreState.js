'use strict';

const state = {
  selectedImage: null,
  lastAnalysis: null,
  lastScore: null,
  history: [],
  lastSentAt: null
};

function setSelectedImage(image) {
  state.selectedImage = image || null;
}

function setAnalysis(image, analysis) {
  state.selectedImage = image || state.selectedImage;
  state.lastAnalysis = analysis || null;
}

function setScore(score) {
  if (!score) return null;
  state.lastScore = score;
  state.lastAnalysis = score.features || state.lastAnalysis;
  state.history.unshift({
    id: score.id,
    imageFile: score.imageFile,
    timestamp: score.timestamp,
    seed: score.seed,
    visualSummary: score.visualSummary
  });
  state.history.splice(24);
  return score;
}

function markSent() {
  state.lastSentAt = new Date().toISOString();
  return state.lastSentAt;
}

function getState() {
  return {
    selectedImage: state.selectedImage,
    lastAnalysis: state.lastAnalysis,
    lastScore: state.lastScore,
    history: state.history.slice(),
    lastSentAt: state.lastSentAt
  };
}

module.exports = {
  setSelectedImage,
  setAnalysis,
  setScore,
  markSent,
  getState
};
