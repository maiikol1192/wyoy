'use strict';

const childProcess = require('child_process');
const auth = require('../../src/auth/manager');

describe('auth manager', () => {
  let execSync;

  beforeEach(() => {
    execSync = vi.spyOn(childProcess, 'execSync');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects Claude authenticated via auth status', () => {
    execSync.mockReturnValue(JSON.stringify({ loggedIn: true }));
    expect(auth.checkClaude()).toBe(true);
  });

  it('detects Claude not authenticated', () => {
    execSync.mockReturnValue(JSON.stringify({ loggedIn: false }));
    expect(auth.checkClaude()).toBe(false);
  });

  it('handles Claude CLI not installed', () => {
    execSync.mockImplementation(() => { throw new Error('not found'); });
    expect(auth.checkClaude()).toBe(false);
  });

  it('detects Gemini authenticated via prompt ping', () => {
    execSync.mockReturnValue('pong');
    expect(auth.checkGemini()).toBe(true);
  });

  it('detects Gemini not authenticated', () => {
    execSync.mockImplementation(() => { throw new Error('auth error'); });
    expect(auth.checkGemini()).toBe(false);
  });

  it('checkEngine routes correctly', () => {
    execSync.mockReturnValue(JSON.stringify({ loggedIn: true }));
    expect(auth.checkEngine('claude')).toBe(true);
  });
});
