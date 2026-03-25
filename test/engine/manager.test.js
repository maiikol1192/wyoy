'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const EngineManager = require('../../src/engine/manager');
const StdoutLogger = require('../../src/capture/stdout-logger');

const MOCK_ENGINE = path.join(__dirname, '../fixtures/mock-engine.sh');
const TEST_LOG_DIR = path.join(os.tmpdir(), `wyoy-mgr-test-${Date.now()}`);

describe('EngineManager', () => {
  it('spawns a process and captures output', async () => {
    fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
    const logger = new StdoutLogger(TEST_LOG_DIR, 'test');
    logger.start('mock', 'full-auto', '/test');

    const manager = new EngineManager(logger);
    const exitPromise = new Promise((resolve) => {
      manager.onExit = resolve;
    });

    manager.spawn(MOCK_ENGINE, ['--crash']);

    const { code, errorClass } = await exitPromise;
    expect(code).toBe(1);
    expect(errorClass).toBe('api_overloaded');

    logger.stop();
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  });

  it('forwards data from engine to stdout callback', async () => {
    const logDir = TEST_LOG_DIR + '-2';
    fs.mkdirSync(logDir, { recursive: true });
    const logger = new StdoutLogger(logDir, 'test2');
    logger.start('mock', 'full-auto', '/test');

    const manager = new EngineManager(logger);
    const received = [];
    manager.onData = (data) => received.push(data);

    const exitPromise = new Promise((resolve) => {
      manager.onExit = resolve;
    });

    manager.spawn(MOCK_ENGINE, ['--crash']);
    await exitPromise;

    expect(received.length).toBeGreaterThan(0);

    logger.stop();
    fs.rmSync(logDir, { recursive: true, force: true });
  });
});
