'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const TEST_DIR = path.join(os.tmpdir(), `wyoy-logger-test-${Date.now()}`);
const StdoutLogger = require('../../src/capture/stdout-logger');

describe('StdoutLogger', () => {
  let logger;

  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    logger = new StdoutLogger(TEST_DIR, 'test-session');
  });

  afterEach(() => {
    logger.stop();
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('starts and creates log file', () => {
    logger.start('claude', 'full-auto', '/test/cwd');
    logger.flush();
    const logFile = path.join(TEST_DIR, 'test-session.log');
    expect(fs.existsSync(logFile)).toBe(true);
    const content = fs.readFileSync(logFile, 'utf8');
    expect(content).toContain('[SESSION_START]');
    expect(content).toContain('engine=claude');
  });

  it('appends output to buffer and log', () => {
    logger.start('claude', 'full-auto', '/test');
    logger.write('Hello world');
    logger.write('Second line');
    logger.flush();
    const content = fs.readFileSync(path.join(TEST_DIR, 'test-session.log'), 'utf8');
    expect(content).toContain('Hello world');
    expect(content).toContain('Second line');
  });

  it('maintains circular buffer of max size', () => {
    logger.start('claude', 'full-auto', '/test');
    for (let i = 0; i < 600; i++) {
      logger.write(`line-${i}`);
    }
    expect(logger.getBuffer().length).toBeLessThanOrEqual(500);
    expect(logger.getBuffer()).toContain('line-599');
    expect(logger.getBuffer()).not.toContain('line-0');
  });

  it('getLastLines returns tail of buffer', () => {
    logger.start('claude', 'full-auto', '/test');
    for (let i = 0; i < 100; i++) {
      logger.write(`line-${i}`);
    }
    const last5 = logger.getLastLines(5);
    expect(last5).toHaveLength(5);
    expect(last5[4]).toContain('line-99');
  });

  it('logEvent writes typed entry', () => {
    logger.start('claude', 'full-auto', '/test');
    logger.logEvent('ENGINE_FAIL', 'code=1, signal=null');
    logger.flush();
    const content = fs.readFileSync(path.join(TEST_DIR, 'test-session.log'), 'utf8');
    expect(content).toContain('[ENGINE_FAIL]');
  });
});
