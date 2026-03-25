'use strict';

const childProcess = require('child_process');

function checkClaude() {
  try {
    const output = childProcess.execSync('claude auth status', {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const status = JSON.parse(output.trim());
    return status.loggedIn === true;
  } catch {
    return false;
  }
}

function checkGemini() {
  try {
    childProcess.execSync('gemini --prompt "ping" --output-format text', {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

function checkEngine(name) {
  if (name === 'claude') return checkClaude();
  if (name === 'gemini') return checkGemini();
  return false;
}

function getAuthCommand(name) {
  if (name === 'claude') return { command: 'claude', args: ['auth', 'login'] };
  if (name === 'gemini') return null;
  return null;
}

function spawnAuthFlow(name) {
  const pty = require('node-pty');
  return new Promise((resolve) => {
    let cmd, args;
    if (name === 'claude') {
      cmd = 'claude';
      args = ['auth', 'login'];
    } else {
      // Gemini handles its own auth on first interactive run.
      // Spawn it normally — it will prompt for Google login.
      cmd = 'gemini';
      args = [];
    }

    const child = pty.spawn(cmd, args, {
      name: 'xterm-256color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      cwd: process.cwd(),
      env: process.env,
    });

    child.onData((data) => process.stdout.write(data));
    process.stdin.setRawMode && process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (data) => child.write(data.toString()));

    child.onExit(({ exitCode }) => {
      process.stdin.setRawMode && process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('data');
      resolve(exitCode === 0);
    });
  });
}

module.exports = { checkClaude, checkGemini, checkEngine, getAuthCommand, spawnAuthFlow };
