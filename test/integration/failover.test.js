'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const EngineManager = require('../../src/engine/manager');
const StdoutLogger = require('../../src/capture/stdout-logger');
const { buildContext, writeHandoffFile, cleanupHandoffFiles } = require('../../src/handoff/context-builder');
const { renderHandoff } = require('../../src/handoff/prompt-template');

const MOCK_ENGINE = path.join(__dirname, '../fixtures/mock-engine.sh');
const TEST_DIR = path.join(os.tmpdir(), `wyoy-integration-${Date.now()}`);

describe('failover integration', () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(TEST_DIR, 'logs'), { recursive: true });
  });

  afterEach(() => {
    cleanupHandoffFiles();
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('detects crash, classifies error, generates handoff prompt', async () => {
    const logger = new StdoutLogger(path.join(TEST_DIR, 'logs'), 'test-session');
    logger.start('claude', 'full-auto', process.cwd());
    const manager = new EngineManager(logger);
    const result = await new Promise((resolve) => {
      manager.onExit = resolve;
      manager.spawn(MOCK_ENGINE, ['--crash']);
    });
    expect(result.code).toBe(1);
    expect(result.errorClass).toBe('api_overloaded');
    const ctx = await buildContext({
      engine: 'claude', errorClass: result.errorClass, workMode: 'full-auto',
      cwd: process.cwd(), startedAt: new Date().toISOString(),
      stdoutLines: logger.getLastLines(50), sessionMessages: [],
    });
    const promptText = renderHandoff(ctx);
    expect(promptText).toContain('claude');
    expect(promptText).toContain('api_overloaded');
    const handoffFile = writeHandoffFile(promptText);
    expect(fs.existsSync(handoffFile)).toBe(true);
    logger.stop();
  });

  it('classifies auth error correctly', async () => {
    const logger = new StdoutLogger(path.join(TEST_DIR, 'logs'), 'auth-test');
    logger.start('claude', 'full-auto', process.cwd());
    const manager = new EngineManager(logger);
    const result = await new Promise((resolve) => {
      manager.onExit = resolve;
      manager.spawn(MOCK_ENGINE, ['--auth-fail']);
    });
    expect(result.errorClass).toBe('auth_expired');
    logger.stop();
  });

  it('classifies network error correctly', async () => {
    const logger = new StdoutLogger(path.join(TEST_DIR, 'logs'), 'net-test');
    logger.start('claude', 'full-auto', process.cwd());
    const manager = new EngineManager(logger);
    const result = await new Promise((resolve) => {
      manager.onExit = resolve;
      manager.spawn(MOCK_ENGINE, ['--network']);
    });
    expect(result.errorClass).toBe('network_error');
    logger.stop();
  });
});
