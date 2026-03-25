'use strict';

const fs = require('fs');
const readline = require('readline');

const MAX_CONTENT_LENGTH = 2000;

function extractTextContent(message) {
  const content = message.content;
  if (typeof content === 'string') return content.slice(0, MAX_CONTENT_LENGTH);
  if (!Array.isArray(content)) return '';
  const textParts = content.filter((block) => block.type === 'text').map((block) => block.text);
  return textParts.join('\n').slice(0, MAX_CONTENT_LENGTH);
}

async function parseSessionFile(filePath, opts = {}) {
  const maxMessages = opts.maxMessages || 20;
  if (!fs.existsSync(filePath)) return [];
  const messages = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (record.type !== 'user' && record.type !== 'assistant') continue;
      if (record.isMeta) continue;
      if (record.type === 'user' && Array.isArray(record.message?.content)) {
        const hasToolResult = record.message.content.some((b) => b.type === 'tool_result');
        if (hasToolResult) continue;
      }
      const text = extractTextContent(record.message);
      if (!text) continue;
      messages.push({ uuid: record.uuid, role: record.message.role, content: text, timestamp: record.timestamp });
    } catch { }
  }
  return messages.slice(-maxMessages);
}

module.exports = { parseSessionFile };
