'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const TEST_DIR = path.join(os.tmpdir(), `wyoy-test-${Date.now()}`);
process.env.WYOY_HOME = TEST_DIR;

const config = require('../../src/utils/config');

describe('config', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns default config when no file exists', () => {
    const cfg = config.load();
    expect(cfg.defaultEngine).toBe('claude');
    expect(cfg.workMode).toBe('full-auto');
  });

  it('saves and loads config', () => {
    const cfg = config.load();
    cfg.defaultEngine = 'gemini';
    config.save(cfg);

    const loaded = config.load();
    expect(loaded.defaultEngine).toBe('gemini');
  });

  it('ensures ~/.wyoy directory exists', () => {
    config.ensureDir();
    expect(fs.existsSync(TEST_DIR)).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, 'logs'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, 'cache'))).toBe(true);
  });

  it('getWyoyHome returns WYOY_HOME or default', () => {
    expect(config.getWyoyHome()).toBe(TEST_DIR);
  });
});
