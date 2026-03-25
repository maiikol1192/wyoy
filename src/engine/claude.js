'use strict';

const MODE_FLAGS = {
  'full-auto': ['--dangerously-skip-permissions'],
  'with-approval': [],
  'read-only': ['--permission-mode', 'plan'],
};

function buildArgs(workMode) {
  return [...(MODE_FLAGS[workMode] || [])];
}

function buildHandoffArgs(workMode, handoffFilePath) {
  return [
    ...buildArgs(workMode),
    '--append-system-prompt-file',
    handoffFilePath,
  ];
}

function buildResumeArgs(workMode) {
  return [...buildArgs(workMode), '--continue'];
}

module.exports = {
  name: 'claude',
  binary: 'claude',
  buildArgs,
  buildHandoffArgs,
  buildResumeArgs,
};
