'use strict';

const fs = require('fs');
const path = require('path');
const stripAnsi = require('strip-ansi');

const MAX_BUFFER_LINES = 500;
const FLUSH_INTERVAL_MS = 5000;
const MAX_LOG_FILES = 10;
const MAX_LOG_SIZE_BYTES = 50 * 1024 * 1024;

class StdoutLogger {
  constructor(logDir, sessionId) {
    this.logDir = logDir;
    this.sessionId = sessionId;
    this.logFile = path.join(logDir, `${sessionId}.log`);
    this.buffer = [];
    this.pendingWrites = [];
    this.flushTimer = null;
    this.stream = null;
  }

  start(engine, mode, cwd) {
    fs.mkdirSync(this.logDir, { recursive: true });
    // Create the file synchronously so it exists immediately
    fs.writeFileSync(this.logFile, '', { flag: 'a' });
    this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
    this._writeEntry('SESSION_START', `engine=${engine}, mode=${mode}, cwd=${cwd}`);
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  write(rawData) {
    const clean = stripAnsi(String(rawData));
    const lines = clean.split('\n').filter((l) => l.length > 0);
    for (const line of lines) {
      this.buffer.push(line);
      if (this.buffer.length > MAX_BUFFER_LINES) {
        this.buffer.shift();
      }
    }
    this.pendingWrites.push(`[${new Date().toISOString()}] [OUTPUT]\n${clean}\n---\n`);
  }

  logEvent(type, detail) {
    this._writeEntry(type, detail);
  }

  getBuffer() {
    return [...this.buffer];
  }

  getLastLines(n) {
    return this.buffer.slice(-n);
  }

  flush() {
    if (this.pendingWrites.length === 0) return;
    const data = this.pendingWrites.join('');
    this.pendingWrites = [];
    // Write synchronously so callers can read the file immediately after flush()
    fs.appendFileSync(this.logFile, data, 'utf8');
  }

  stop() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
    if (this.stream) {
      this.stream.on('error', () => {});
      this.stream.end();
      this.stream = null;
    }
  }

  _writeEntry(type, detail) {
    const entry = `[${new Date().toISOString()}] [${type}]\n${detail}\n---\n`;
    this.pendingWrites.push(entry);
  }

  static rotateIfNeeded(logDir) {
    try {
      const files = fs.readdirSync(logDir)
        .filter((f) => f.endsWith('.log'))
        .map((f) => ({ name: f, mtime: fs.statSync(path.join(logDir, f)).mtimeMs }))
        .sort((a, b) => a.mtime - b.mtime);
      while (files.length > MAX_LOG_FILES) {
        const oldest = files.shift();
        fs.unlinkSync(path.join(logDir, oldest.name));
      }
      for (const f of files) {
        const stat = fs.statSync(path.join(logDir, f.name));
        if (stat.size > MAX_LOG_SIZE_BYTES) {
          fs.unlinkSync(path.join(logDir, f.name));
        }
      }
    } catch { }
  }
}

module.exports = StdoutLogger;
