'use strict';

const platform = require('../../src/utils/platform');

describe('platform', () => {
  it('detects macOS', () => {
    expect(platform.isMacOS()).toBe(process.platform === 'darwin');
  });

  it('resolves engine binary path or null', () => {
    const claudePath = platform.resolveEngine('claude');
    expect(typeof claudePath === 'string' || claudePath === null).toBe(true);
  });

  it('parses version string', () => {
    expect(platform.parseVersion('2.1.83 (Claude Code)')).toBe('2.1.83');
    expect(platform.parseVersion('0.35.0')).toBe('0.35.0');
    expect(platform.parseVersion('garbage')).toBe(null);
  });

  it('checks minimum version', () => {
    expect(platform.meetsMinVersion('2.1.83', '2.1.0')).toBe(true);
    expect(platform.meetsMinVersion('1.0.0', '2.1.0')).toBe(false);
    expect(platform.meetsMinVersion(null, '2.1.0')).toBe(false);
  });
});
