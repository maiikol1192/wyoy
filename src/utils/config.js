'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_CONFIG = {
  version: '0.0.1-beta',
  defaultEngine: 'claude',
  workMode: 'full-auto',
  lastUsedEngine: 'claude',
  auth: {
    claude: { verified: false, lastCheck: null },
    gemini: { verified: false, lastCheck: null },
  },
  update: {
    lastCheck: null,
    channel: 'stable',
  },
};

function getWyoyHome() {
  return process.env.WYOY_HOME || path.join(os.homedir(), '.wyoy');
}

function configPath() {
  return path.join(getWyoyHome(), 'config.json');
}

function ensureDir() {
  const home = getWyoyHome();
  fs.mkdirSync(path.join(home, 'logs'), { recursive: true });
  fs.mkdirSync(path.join(home, 'cache'), { recursive: true });
}

function load() {
  const filePath = configPath();
  if (!fs.existsSync(filePath)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function save(cfg) {
  ensureDir();
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
}

module.exports = { load, save, ensureDir, getWyoyHome, DEFAULT_CONFIG };
