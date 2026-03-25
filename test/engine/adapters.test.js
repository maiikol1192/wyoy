'use strict';

const claude = require('../../src/engine/claude');
const gemini = require('../../src/engine/gemini');

describe('claude adapter', () => {
  it('builds args for full-auto mode', () => {
    const args = claude.buildArgs('full-auto');
    expect(args).toContain('--dangerously-skip-permissions');
  });

  it('builds args for with-approval mode', () => {
    const args = claude.buildArgs('with-approval');
    expect(args).toEqual([]);
  });

  it('builds args for read-only mode', () => {
    const args = claude.buildArgs('read-only');
    expect(args).toContain('--permission-mode');
    expect(args).toContain('plan');
  });

  it('builds handoff args with system prompt file', () => {
    const args = claude.buildHandoffArgs('full-auto', '/tmp/handoff.txt');
    expect(args).toContain('--append-system-prompt-file');
    expect(args).toContain('/tmp/handoff.txt');
    expect(args).toContain('--dangerously-skip-permissions');
  });

  it('returns correct engine name', () => {
    expect(claude.name).toBe('claude');
  });
});

describe('gemini adapter', () => {
  it('builds args for full-auto mode', () => {
    const args = gemini.buildArgs('full-auto');
    expect(args).toContain('--yolo');
  });

  it('builds args for with-approval mode', () => {
    const args = gemini.buildArgs('with-approval');
    expect(args).toContain('--approval-mode');
    expect(args).toContain('default');
  });

  it('builds args for read-only mode', () => {
    const args = gemini.buildArgs('read-only');
    expect(args).toContain('--approval-mode');
    expect(args).toContain('plan');
  });

  it('returns correct engine name', () => {
    expect(gemini.name).toBe('gemini');
  });
});
