'use strict';

const path = require('path');
const { parseSessionFile } = require('../../src/capture/claude-session');

const FIXTURE = path.join(__dirname, '../fixtures/mock-session.jsonl');

describe('claude-session reader', () => {
  it('parses JSONL and extracts user/assistant messages', async () => {
    const messages = await parseSessionFile(FIXTURE);
    expect(messages.length).toBe(5);
  });

  it('extracts text content from assistant messages', async () => {
    const messages = await parseSessionFile(FIXTURE);
    const assistant = messages.find((m) => m.uuid === 'a2');
    expect(assistant.content).toBe('Found the issue.');
    expect(assistant.content).not.toContain('hmm');
  });

  it('extracts plain string content from user messages', async () => {
    const messages = await parseSessionFile(FIXTURE);
    const user = messages.find((m) => m.uuid === 'u1');
    expect(user.content).toBe('Fix the auth bug');
    expect(user.role).toBe('user');
  });

  it('respects maxMessages limit', async () => {
    const messages = await parseSessionFile(FIXTURE, { maxMessages: 3 });
    expect(messages.length).toBe(3);
    expect(messages[0].uuid).toBe('a2');
  });

  it('returns empty array for non-existent file', async () => {
    const messages = await parseSessionFile('/nonexistent.jsonl');
    expect(messages).toEqual([]);
  });
});
