'use strict';

const { renderHandoff } = require('../../src/handoff/prompt-template');

const context = {
  engine: 'claude',
  errorClass: 'api_overloaded',
  cwd: '/Users/test/project',
  branch: 'main',
  workMode: 'full-auto',
  duration: '15 minutes',
  gitDiffStat: ' src/auth.js | 12 +++---\n 2 files changed',
  messages: [
    { role: 'user', content: 'Fix the auth bug' },
    { role: 'assistant', content: 'Looking at auth.js now.' },
  ],
};

describe('handoff prompt template', () => {
  it('includes engine name', () => {
    expect(renderHandoff(context)).toContain('claude');
  });
  it('includes error class', () => {
    expect(renderHandoff(context)).toContain('api_overloaded');
  });
  it('includes git diff stat', () => {
    expect(renderHandoff(context)).toContain('src/auth.js');
  });
  it('includes conversation messages', () => {
    const prompt = renderHandoff(context);
    expect(prompt).toContain('Fix the auth bug');
    expect(prompt).toContain('Looking at auth.js now');
  });
  it('includes instructions to not repeat work', () => {
    expect(renderHandoff(context)).toContain('Do NOT repeat work');
  });
  it('handles empty messages array', () => {
    expect(renderHandoff({ ...context, messages: [] })).toContain('No conversation history');
  });
});
