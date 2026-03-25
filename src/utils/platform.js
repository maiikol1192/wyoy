'use strict';

const { execSync } = require('child_process');
const semver = require('semver');

const MIN_VERSIONS = {
  claude: '2.1.0',
  gemini: '0.30.0',
};

function isMacOS() {
  return process.platform === 'darwin';
}

function resolveEngine(name) {
  try {
    const result = execSync(`which ${name}`, { encoding: 'utf8' }).trim();
    return result || null;
  } catch {
    return null;
  }
}

function getEngineVersion(name) {
  try {
    const output = execSync(`${name} --version`, {
      encoding: 'utf8',
      timeout: 10000,
    }).trim();
    return parseVersion(output);
  } catch {
    return null;
  }
}

function parseVersion(str) {
  if (!str) return null;
  const match = str.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function meetsMinVersion(version, minVersion) {
  if (!version) return false;
  return semver.gte(version, minVersion);
}

module.exports = {
  isMacOS,
  resolveEngine,
  getEngineVersion,
  parseVersion,
  meetsMinVersion,
  MIN_VERSIONS,
};
