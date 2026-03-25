'use strict';

const readline = require('readline');
const chalk = require('chalk');
const log = require('../utils/logger');
const config = require('../utils/config');
const auth = require('../auth/manager');
const platform = require('../utils/platform');

function prompt(question, choices) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('');
    console.log(chalk.bold(question));
    choices.forEach((c, i) => {
      const marker = c.default ? chalk.cyan('> ') : '  ';
      console.log(`${marker}${i + 1}. ${c.label}`);
    });
    console.log('');

    rl.question(chalk.dim('Choice [default: 1]: '), (answer) => {
      rl.close();
      const idx = parseInt(answer, 10) - 1;
      if (idx >= 0 && idx < choices.length) {
        resolve(choices[idx].value);
      } else {
        resolve(choices.find((c) => c.default)?.value || choices[0].value);
      }
    });
  });
}

async function run(options = {}) {
  const cfg = config.load();
  const pkg = require('../../package.json');

  log.banner(pkg.version);

  let engine = options.engine;
  if (!engine) {
    engine = await prompt('Which engine today?', [
      { label: 'Claude' + chalk.dim(' (default)'), value: 'claude', default: cfg.defaultEngine === 'claude' },
      { label: 'Gemini', value: 'gemini', default: cfg.defaultEngine === 'gemini' },
    ]);
  }

  const enginePath = platform.resolveEngine(engine);
  if (!enginePath) {
    log.error(`${engine} CLI not found. Install it first.`);
    process.exit(1);
  }

  const version = platform.getEngineVersion(engine);
  const minVersion = platform.MIN_VERSIONS[engine];
  if (version && !platform.meetsMinVersion(version, minVersion)) {
    log.warn(`${engine} v${version} detected. Minimum required: v${minVersion}`);
  }

  log.info(`Checking ${engine} authentication...`);
  let isAuth = auth.checkEngine(engine);
  if (!isAuth) {
    log.warn(`${engine} is not authenticated.`);
    log.info('Opening login flow...');
    const success = await auth.spawnAuthFlow(engine);
    if (success) {
      isAuth = auth.checkEngine(engine);
    }
    if (!isAuth) {
      log.error(`${engine} authentication failed.`);
      const other = engine === 'claude' ? 'gemini' : 'claude';
      log.info(`Try: wyoy --engine ${other}`);
      process.exit(1);
    }
  }
  log.success(`${engine} authenticated.`);

  let workMode = options.workMode;
  if (!workMode) {
    workMode = await prompt('Work mode?', [
      { label: 'Full auto' + chalk.dim(' (skip all permissions)'), value: 'full-auto', default: cfg.workMode === 'full-auto' },
      { label: 'With approval' + chalk.dim(' (confirm actions)'), value: 'with-approval', default: cfg.workMode === 'with-approval' },
      { label: 'Read only' + chalk.dim(' (plan mode)'), value: 'read-only', default: cfg.workMode === 'read-only' },
    ]);
  }

  cfg.defaultEngine = engine;
  cfg.workMode = workMode;
  cfg.lastUsedEngine = engine;
  cfg.auth[engine] = { verified: true, lastCheck: new Date().toISOString() };
  config.save(cfg);

  const fallback = engine === 'claude' ? 'gemini' : 'claude';
  const fallbackAuth = auth.checkEngine(fallback);
  if (!fallbackAuth) {
    log.warn(`${fallback} not authenticated. Fallback unavailable.`);
    log.info(`Use: wyoy engine auth ${fallback}`);
  }

  return { engine, workMode, fallbackAuth };
}

module.exports = { run };
