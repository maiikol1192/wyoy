'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');

const TEST_DIR = path.join(os.tmpdir(), `wyoy-update-test-${Date.now()}`);
process.env.WYOY_HOME = TEST_DIR;

const update = require('../../src/update/checker');

describe('update checker', () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(TEST_DIR, 'cache'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('checks npm for latest version', () => {
    const spy = vi.spyOn(childProcess, 'execSync').mockReturnValue('0.0.2-beta\n');
    const latest = update.checkLatestVersion('wyoy');
    expect(latest).toBe('0.0.2-beta');
    spy.mockRestore();
  });

  it('returns null on npm failure', () => {
    const spy = vi.spyOn(childProcess, 'execSync').mockImplementation(() => { throw new Error('offline'); });
    expect(update.checkLatestVersion('wyoy')).toBe(null);
    spy.mockRestore();
  });

  it('uses cache within TTL', () => {
    const cache = { wyoy: { latest: '0.0.5', checkedAt: new Date().toISOString() } };
    fs.writeFileSync(path.join(TEST_DIR, 'cache', 'update-check.json'), JSON.stringify(cache));
    expect(update.getCachedVersion('wyoy')).toBe('0.0.5');
  });

  it('ignores expired cache', () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const cache = { wyoy: { latest: '0.0.5', checkedAt: old } };
    fs.writeFileSync(path.join(TEST_DIR, 'cache', 'update-check.json'), JSON.stringify(cache));
    expect(update.getCachedVersion('wyoy')).toBe(null);
  });
});
