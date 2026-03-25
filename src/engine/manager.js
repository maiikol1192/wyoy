'use strict';

const pty = require('node-pty');
const health = require('./health');

class EngineManager {
  constructor(logger) {
    this.logger = logger;
    this.process = null;
    this.onExit = null;
    this.onData = null;
    this.onZombie = null;
    this.zombieTimer = null;
  }

  spawn(command, args = []) {
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    this.process = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.cwd(),
      env: process.env,
    });

    this.process.onData((data) => {
      this.logger.write(data);
      if (this.onData) this.onData(data);
      this._resetZombieTimer();
    });

    this.process.onExit(({ exitCode }) => {
      this._clearZombieTimer();
      const lastLines = this.logger.getLastLines(50);
      const errorClass = health.classifyError(exitCode, lastLines);
      this.logger.logEvent('ENGINE_EXIT', `code=${exitCode}, error_class=${errorClass}`);
      this.logger.flush();
      if (this.onExit) this.onExit({ code: exitCode, errorClass });
    });
  }

  write(data) {
    if (this.process) this.process.write(data);
  }

  resize(cols, rows) {
    if (this.process) this.process.resize(cols, rows);
  }

  kill(signal = 'SIGTERM') {
    if (this.process) {
      this.process.kill(signal);
    }
  }

  gracefulKill() {
    this.kill('SIGTERM');
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.kill('SIGKILL');
        resolve();
      }, 5000);

      const origOnExit = this.onExit;
      this.onExit = (result) => {
        clearTimeout(timeout);
        if (origOnExit) origOnExit(result);
        resolve();
      };
    });
  }

  getPid() {
    return this.process ? this.process.pid : null;
  }

  _resetZombieTimer() {
    this._clearZombieTimer();
    this.zombieTimer = setTimeout(() => {
      if (this.onZombie) this.onZombie();
    }, 5 * 60 * 1000);
  }

  _clearZombieTimer() {
    if (this.zombieTimer) {
      clearTimeout(this.zombieTimer);
      this.zombieTimer = null;
    }
  }
}

module.exports = EngineManager;
