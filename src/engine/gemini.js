'use strict';

const MODE_FLAGS = {
  'full-auto': ['--yolo'],
  'with-approval': ['--approval-mode', 'default'],
  'read-only': ['--approval-mode', 'plan'],
};

function buildArgs(workMode) {
  return [...(MODE_FLAGS[workMode] || [])];
}

function buildHandoffArgs(workMode, _handoffFilePath) {
  return [...buildArgs(workMode)];
}

function buildResumeArgs(workMode) {
  return [...buildArgs(workMode), '--resume', 'latest'];
}

module.exports = {
  name: 'gemini',
  binary: 'gemini',
  buildArgs,
  buildHandoffArgs,
  buildResumeArgs,
};
