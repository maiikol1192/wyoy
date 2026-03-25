'use strict';

const health = require('../../src/engine/health');

describe('health monitor', () => {
  it('classifies API overloaded', () => {
    expect(health.classifyError(1, ['some output', 'Error: overloaded', 'exit'])).toBe('api_overloaded');
  });
  it('classifies rate limit (529)', () => {
    expect(health.classifyError(1, ['request failed with status 529'])).toBe('api_overloaded');
  });
  it('classifies auth expired', () => {
    expect(health.classifyError(1, ['Error: unauthorized - token expired'])).toBe('auth_expired');
  });
  it('classifies network error', () => {
    expect(health.classifyError(1, ['Error: connect ECONNREFUSED 127.0.0.1:443'])).toBe('network_error');
  });
  it('classifies unknown crash', () => {
    expect(health.classifyError(1, ['segfault or something weird'])).toBe('crash');
  });
  it('returns normal_exit for code 0', () => {
    expect(health.classifyError(0, [])).toBe('normal_exit');
  });
  it('generates human-readable error description', () => {
    expect(health.describeError('api_overloaded')).toContain('API');
  });
});
