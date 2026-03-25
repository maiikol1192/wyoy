'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getWyoyHome, ensureDir } = require('../utils/config');

let currentSession = null;

function sessionPath() {
  return path.join(getWyoyHome(), 'session.json');
}

function lockPath() {
  return path.join(getWyoyHome(), 'wyoy.lock');
}

function create(opts) {
  ensureDir();
  currentSession = {
    id: `wyoy-${crypto.randomUUID()}`,
    startedAt: new Date().toISOString(),
    engine: opts.engine,
    fallbackEngine: opts.engine === 'claude' ? 'gemini' : 'claude',
    workMode: opts.workMode,
    cwd: process.cwd(),
    gitBranch: null,
    enginePid: null,
    logFile: null,
    handoffs: [],
  };
  return currentSession;
}

function get() { return currentSession; }

function save() {
  if (!currentSession) return;
  ensureDir();
  fs.writeFileSync(sessionPath(), JSON.stringify(currentSession, null, 2), 'utf8');
}

function load() {
  const p = sessionPath();
  if (!fs.existsSync(p)) return null;
  try {
    currentSession = JSON.parse(fs.readFileSync(p, 'utf8'));
    return currentSession;
  } catch { return null; }
}

function clear() {
  currentSession = null;
  const p = sessionPath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function recordHandoff(from, to, reason) {
  if (!currentSession) return;
  currentSession.handoffs.push({ from, to, at: new Date().toISOString(), reason });
  currentSession.engine = to;
  currentSession.fallbackEngine = from;
  save();
}

function acquireLock() {
  ensureDir();
  const lp = lockPath();
  if (fs.existsSync(lp)) {
    const existingPid = parseInt(fs.readFileSync(lp, 'utf8').trim(), 10);
    try {
      process.kill(existingPid, 0);
      return false;
    } catch { }
  }
  fs.writeFileSync(lp, String(process.pid), 'utf8');
  return true;
}

function releaseLock() {
  const lp = lockPath();
  if (fs.existsSync(lp)) fs.unlinkSync(lp);
}

module.exports = { create, get, save, load, clear, recordHandoff, acquireLock, releaseLock };
