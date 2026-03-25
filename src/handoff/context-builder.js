'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderHandoff } = require('./prompt-template');

function gitCommand(cmd, cwd) {
  try {
    return childProcess.execSync(cmd, { encoding: 'utf8', cwd, timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function calcDuration(startedAt) {
  if (!startedAt) return 'unknown';
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'less than a minute';
  if (mins < 60) return `${mins} minutes`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

async function buildContext(opts) {
  const { engine, errorClass, workMode, cwd, startedAt, stdoutLines, sessionMessages } = opts;
  const branch = gitCommand('git rev-parse --abbrev-ref HEAD', cwd);
  const diffStat = gitCommand('git diff --stat', cwd);
  const duration = calcDuration(startedAt);
  let messages;
  if (sessionMessages && sessionMessages.length > 0) {
    messages = sessionMessages;
  } else if (stdoutLines && stdoutLines.length > 0) {
    messages = stdoutLines.map((line) => ({ role: 'user', content: line }));
  } else {
    messages = [];
  }
  return { engine, errorClass, cwd, branch, workMode, duration, gitDiffStat: diffStat || 'No file changes detected.', messages };
}

function writeHandoffFile(promptContent) {
  const id = crypto.randomUUID();
  const filePath = path.join('/tmp', `wyoy-handoff-${id}.txt`);
  fs.writeFileSync(filePath, promptContent, 'utf8');
  return filePath;
}

function cleanupHandoffFiles() {
  try {
    const files = fs.readdirSync('/tmp').filter((f) => f.startsWith('wyoy-handoff-'));
    for (const f of files) {
      fs.unlinkSync(path.join('/tmp', f));
    }
  } catch { }
}

module.exports = { buildContext, writeHandoffFile, cleanupHandoffFiles, renderHandoff };
