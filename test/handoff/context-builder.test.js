'use strict';

const fs = require('fs');
const childProcess = require('child_process');

const { buildContext, writeHandoffFile } = require('../../src/handoff/context-builder');

describe('context-builder', () => {
  let execSync;

  beforeEach(() => {
    execSync = vi.spyOn(childProcess, 'execSync');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('collects git info', async () => {
    execSync
      .mockReturnValueOnce('main\n')
      .mockReturnValueOnce(' src/a.js | 5 ++\n')
      .mockReturnValueOnce('M src/a.js\n');
    const ctx = await buildContext({
      engine: 'claude', errorClass: 'crash', workMode: 'full-auto',
      cwd: '/test', startedAt: new Date(Date.now() - 60000).toISOString(),
      stdoutLines: ['user said hi'], sessionMessages: [],
    });
    expect(ctx.branch).toBe('main');
    expect(ctx.gitDiffStat).toContain('src/a.js');
  });

  it('uses session messages when available', async () => {
    execSync.mockReturnValue('main\n');
    const ctx = await buildContext({
      engine: 'claude', errorClass: 'crash', workMode: 'full-auto',
      cwd: '/test', startedAt: new Date().toISOString(),
      stdoutLines: ['fallback'], sessionMessages: [{ role: 'user', content: 'do stuff' }],
    });
    expect(ctx.messages[0].content).toBe('do stuff');
  });

  it('writeHandoffFile writes to /tmp and returns path', () => {
    const filePath = writeHandoffFile('test handoff prompt');
    expect(filePath).toContain('/tmp/wyoy-handoff-');
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('test handoff prompt');
    fs.unlinkSync(filePath);
  });
});
