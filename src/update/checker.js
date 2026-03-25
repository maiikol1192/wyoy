'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { getWyoyHome } = require('../utils/config');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cachePath() {
  return path.join(getWyoyHome(), 'cache', 'update-check.json');
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(cachePath(), 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  const dir = path.dirname(cachePath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cachePath(), JSON.stringify(cache, null, 2), 'utf8');
}

function getCachedVersion(packageName) {
  const cache = loadCache();
  const entry = cache[packageName];
  if (!entry) return null;
  const age = Date.now() - new Date(entry.checkedAt).getTime();
  if (age > CACHE_TTL_MS) return null;
  return entry.latest;
}

function checkLatestVersion(packageName) {
  try {
    const output = childProcess.execSync(`npm view ${packageName} version`, {
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.trim() || null;
  } catch {
    return null;
  }
}

function updateCache(packageName, version) {
  const cache = loadCache();
  cache[packageName] = { latest: version, checkedAt: new Date().toISOString() };
  saveCache(cache);
}

function needsUpdate(installed, latest) {
  if (!installed || !latest) return false;
  return semver.lt(installed, latest);
}

module.exports = { checkLatestVersion, getCachedVersion, updateCache, needsUpdate };
