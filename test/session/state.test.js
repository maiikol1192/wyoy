'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const TEST_DIR = path.join(os.tmpdir(), `wyoy-state-test-${Date.now()}`);
process.env.WYOY_HOME = TEST_DIR;

const state = require('../../src/session/state');

describe('session state', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    state.clear();
    try { state.releaseLock(); } catch {}
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('creates a new session', () => {
    const session = state.create({ engine: 'claude', workMode: 'full-auto' });
    expect(session.id).toMatch(/^wyoy-/);
    expect(session.engine).toBe('claude');
    expect(session.handoffs).toEqual([]);
  });

  it('saves and loads session', () => {
    state.create({ engine: 'claude', workMode: 'full-auto' });
    state.save();
    const loaded = state.load();
    expect(loaded.engine).toBe('claude');
  });

  it('records a handoff', () => {
    state.create({ engine: 'claude', workMode: 'full-auto' });
    state.recordHandoff('claude', 'gemini', 'api_overloaded');
    const session = state.get();
    expect(session.handoffs).toHaveLength(1);
    expect(session.handoffs[0].from).toBe('claude');
  });

  it('acquires and releases lock', () => {
    expect(state.acquireLock()).toBe(true);
    expect(state.acquireLock()).toBe(false);
    state.releaseLock();
    expect(state.acquireLock()).toBe(true);
    state.releaseLock();
  });

  it('detects stale lock', () => {
    const lockFile = path.join(TEST_DIR, 'wyoy.lock');
    fs.writeFileSync(lockFile, '99999999');
    expect(state.acquireLock()).toBe(true);
    state.releaseLock();
  });
});
