'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');
const config = require('./utils/config');
const log = require('./utils/logger');
const platform = require('./utils/platform');
const auth = require('./auth/manager');
const sessionInit = require('./session/init');
const sessionState = require('./session/state');
const EngineManager = require('./engine/manager');
const StdoutLogger = require('./capture/stdout-logger');
const health = require('./engine/health');
const { buildContext, writeHandoffFile, cleanupHandoffFiles, renderHandoff } = require('./handoff/context-builder');
const { parseSessionFile } = require('./capture/claude-session');
const update = require('./update/checker');
const claudeAdapter = require('./engine/claude');
const geminiAdapter = require('./engine/gemini');
const readline = require('readline');
const path = require('path');
const os = require('os');
const fs = require('fs');

const ADAPTERS = { claude: claudeAdapter, gemini: geminiAdapter };

let activeManager = null;
let activeLogger = null;

function getAdapter(name) {
  return ADAPTERS[name];
}

async function promptChoice(question, options) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(question);
    options.forEach((o) => console.log(`  [${o.key}] ${o.label}`));
    rl.question('> ', (answer) => {
      rl.close();
      const choice = options.find((o) => o.key.toLowerCase() === answer.toLowerCase());
      resolve(choice ? choice.value : options[0].value);
    });
  });
}

async function startEngine(engine, workMode, handoffFile) {
  const adapter = getAdapter(engine);

  const args = handoffFile
    ? adapter.buildHandoffArgs(workMode, handoffFile)
    : adapter.buildArgs(workMode);

  const session = sessionState.get();
  const logDir = path.join(config.getWyoyHome(), 'logs');

  StdoutLogger.rotateIfNeeded(logDir);

  const logger = new StdoutLogger(logDir, session.id);
  logger.start(engine, workMode, process.cwd());

  const manager = new EngineManager(logger);
  activeManager = manager;
  activeLogger = logger;

  // Clean up old listeners to prevent accumulation
  process.stdin.removeAllListeners('data');
  process.stdout.removeAllListeners('resize');

  manager.onData = (data) => {
    process.stdout.write(data);
  };

  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (data) => manager.write(data.toString()));

  process.stdout.on('resize', () => {
    manager.resize(process.stdout.columns, process.stdout.rows);
  });

  manager.onZombie = () => {
    log.warn('Engine not responding for 5 minutes.');
  };

  session.logFile = path.join(logDir, `${session.id}.log`);
  sessionState.save();

  let geminiHandoffContent = null;
  if (handoffFile && engine === 'gemini') {
    geminiHandoffContent = fs.readFileSync(handoffFile, 'utf8');
  }

  return new Promise((resolve) => {
    manager.onExit = async ({ code, errorClass }) => {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('data');
      process.stdout.removeAllListeners('resize');
      logger.stop();

      if (handoffFile && fs.existsSync(handoffFile)) {
        fs.unlinkSync(handoffFile);
      }

      resolve({ code, errorClass, engine, logger });
    };

    manager.spawn(adapter.binary, args);
    session.enginePid = manager.getPid();
    sessionState.save();

    if (geminiHandoffContent) {
      const origOnData = manager.onData;
      manager.onData = (data) => {
        if (origOnData) origOnData(data);
        if (geminiHandoffContent) {
          const text = String(data);
          if (/^>\s*$/m.test(text) || /ready/i.test(text) || text.includes('\u276F')) {
            manager.write(geminiHandoffContent + '\n');
            geminiHandoffContent = null;
          }
        }
      };
      setTimeout(() => {
        if (geminiHandoffContent) {
          manager.write(geminiHandoffContent + '\n');
          geminiHandoffContent = null;
        }
      }, 10000);
    }
  });
}

async function handleFailover(result) {
  const { code, errorClass, engine, logger } = result;
  const session = sessionState.get();
  const fallback = session.fallbackEngine;

  if (errorClass === 'normal_exit') return null;

  console.log('');
  const action = await promptChoice(
    chalk.yellow(`\n${engine} disconnected (exit ${code}): ${health.describeError(errorClass)}\n`),
    [
      { key: 'R', label: `Retry with ${engine}`, value: 'retry' },
      { key: 'S', label: `Switch to ${fallback} (fallback)`, value: 'switch' },
      { key: 'Q', label: 'Quit', value: 'quit' },
    ]
  );

  if (action === 'quit') {
    sessionState.clear();
    sessionState.releaseLock();
    process.exit(0);
  }

  if (action === 'retry') {
    const adapter = getAdapter(engine);
    const resumeArgs = adapter.buildResumeArgs(session.workMode);
    const logDir = path.join(config.getWyoyHome(), 'logs');
    const retryLogger = new StdoutLogger(logDir, session.id + '-retry-' + Date.now());
    retryLogger.start(engine, session.workMode, process.cwd());
    const retryManager = new EngineManager(retryLogger);
    activeManager = retryManager;
    activeLogger = retryLogger;

    process.stdin.removeAllListeners('data');
    process.stdout.removeAllListeners('resize');
    retryManager.onData = (data) => process.stdout.write(data);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (data) => retryManager.write(data.toString()));
    process.stdout.on('resize', () => retryManager.resize(process.stdout.columns, process.stdout.rows));

    return new Promise((resolve) => {
      retryManager.onExit = async ({ code, errorClass }) => {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeAllListeners('data');
        process.stdout.removeAllListeners('resize');
        retryLogger.stop();
        resolve({ code, errorClass, engine, logger: retryLogger });
      };
      retryManager.spawn(adapter.binary, resumeArgs);
    });
  }

  // Switch to fallback
  if (!auth.checkEngine(fallback)) {
    log.error(`${fallback} is not authenticated. Cannot switch.`);
    log.info(`Run: wyoy engine auth ${fallback}`);
    sessionState.clear();
    sessionState.releaseLock();
    process.exit(1);
  }

  let sessionMessages = [];
  if (engine === 'claude') {
    const cwdEncoded = process.cwd().replace(/\//g, '-').replace(/^-/, '');
    const projectDir = path.join(os.homedir(), '.claude', 'projects', cwdEncoded);
    if (fs.existsSync(projectDir)) {
      const files = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl')).sort();
      if (files.length > 0) {
        sessionMessages = await parseSessionFile(path.join(projectDir, files[files.length - 1]));
      }
    }
  }

  const ctx = await buildContext({
    engine, errorClass, workMode: session.workMode, cwd: process.cwd(),
    startedAt: session.startedAt, stdoutLines: logger.getLastLines(50), sessionMessages,
  });

  const promptText = renderHandoff(ctx);
  const handoffFile = writeHandoffFile(promptText);
  sessionState.recordHandoff(engine, fallback, errorClass);
  log.info(`Switching to ${fallback} with context...`);

  return startEngine(fallback, session.workMode, handoffFile);
}

async function mainAction(options) {
  if (!sessionState.acquireLock()) {
    log.error('Another WYOY instance is running. Exiting.');
    process.exit(1);
  }

  cleanupHandoffFiles();

  const { engine, workMode } = await sessionInit.run(options);

  sessionState.create({ engine, workMode });
  sessionState.save();

  try {
    const latest = update.getCachedVersion('wyoy') || update.checkLatestVersion('wyoy');
    if (latest) {
      update.updateCache('wyoy', latest);
      if (update.needsUpdate(pkg.version, latest)) {
        log.box([
          `WYOY update available: ${pkg.version} -> ${latest}`,
          `Run 'wyoy update' to install`,
        ]);
      }
    }
  } catch { }

  let result = await startEngine(engine, workMode, null);
  while (result && result.errorClass !== 'normal_exit') {
    result = await handleFailover(result);
  }

  sessionState.clear();
  sessionState.releaseLock();
}

const program = new Command();

program
  .name('wyoy')
  .description('Work Yes Or Yes - AI engine failover CLI')
  .version(pkg.version)
  .option('--engine <engine>', 'Start with specific engine (claude or gemini)')
  .action(mainAction);

const engineCmd = program.command('engine').description('Manage engines');

engineCmd.command('status').description('Show engine status and auth')
  .action(async () => {
    const claudeVersion = platform.getEngineVersion('claude') || 'not found';
    const geminiVersion = platform.getEngineVersion('gemini') || 'not found';
    const claudeAuth = auth.checkEngine('claude');
    const geminiAuth = auth.checkEngine('gemini');
    const cfg = config.load();
    log.box([
      'WYOY Engine Status', '',
      `  Claude v${claudeVersion}  ${claudeAuth ? chalk.green('authenticated') : chalk.red('not authenticated')}`,
      `  Gemini v${geminiVersion}  ${geminiAuth ? chalk.green('authenticated') : chalk.red('not authenticated')}`,
      `  Default: ${cfg.defaultEngine}`,
      `  Mode:    ${cfg.workMode}`,
    ]);
  });

engineCmd.command('auth <engine>').description('Authenticate an engine')
  .action(async (engine) => {
    if (engine !== 'claude' && engine !== 'gemini') {
      log.error('Engine must be "claude" or "gemini"');
      process.exit(1);
    }
    log.info(`Opening ${engine} login flow...`);
    const success = await auth.spawnAuthFlow(engine);
    if (success) {
      log.success(`${engine} authenticated successfully.`);
      const cfg = config.load();
      cfg.auth[engine] = { verified: true, lastCheck: new Date().toISOString() };
      config.save(cfg);
    } else {
      log.error(`${engine} authentication failed.`);
    }
  });

engineCmd.command('switch [target]').description('Switch to the other engine')
  .action(async (target) => {
    const session = sessionState.load();
    if (!session) {
      log.error('No active WYOY session. Start one with: wyoy');
      process.exit(1);
    }
    const current = session.engine;
    const switchTo = target || session.fallbackEngine;
    if (switchTo !== 'claude' && switchTo !== 'gemini') {
      log.error('Target must be "claude" or "gemini"');
      process.exit(1);
    }
    if (switchTo === current) {
      log.info(`Already using ${current}.`);
      return;
    }
    if (!auth.checkEngine(switchTo)) {
      log.error(`${switchTo} is not authenticated.`);
      log.info(`Run: wyoy engine auth ${switchTo}`);
      process.exit(1);
    }
    const switchFile = path.join(config.getWyoyHome(), 'switch-request.json');
    fs.writeFileSync(switchFile, JSON.stringify({ to: switchTo }), 'utf8');
    const lockFile = path.join(config.getWyoyHome(), 'wyoy.lock');
    if (fs.existsSync(lockFile)) {
      const pid = parseInt(fs.readFileSync(lockFile, 'utf8').trim(), 10);
      try {
        process.kill(pid, 'SIGUSR1');
        log.success(`Switch signal sent to WYOY (PID ${pid}). Transitioning to ${switchTo}...`);
      } catch {
        log.error('Could not signal running WYOY process.');
        fs.unlinkSync(switchFile);
      }
    } else {
      log.error('No running WYOY session found.');
      fs.unlinkSync(switchFile);
    }
  });

program.command('update').description('Check for and install WYOY updates')
  .option('--check', 'Check only')
  .action(async (options) => {
    log.info('Checking for updates...');
    const latest = update.checkLatestVersion('wyoy');
    if (!latest) {
      log.error('Could not check for updates.');
      return;
    }
    console.log(`  Installed: ${pkg.version}`);
    console.log(`  Latest:    ${latest}`);
    if (!update.needsUpdate(pkg.version, latest)) {
      log.success('Already on the latest version.');
      return;
    }
    if (options.check) return;
    const { execSync } = require('child_process');
    log.info('Installing update...');
    try {
      execSync('npm install -g wyoy@latest', { stdio: 'inherit' });
      log.success(`Updated to ${latest}. Restart wyoy.`);
    } catch {
      log.error('Update failed. Try: npm install -g wyoy@latest');
    }
  });

process.on('SIGTERM', () => {
  if (activeManager) activeManager.kill('SIGTERM');
  if (activeLogger) activeLogger.stop();
  sessionState.releaseLock();
  process.exit(0);
});

process.on('SIGHUP', () => {
  if (activeManager) activeManager.kill('SIGTERM');
  if (activeLogger) activeLogger.stop();
  sessionState.save();
  sessionState.releaseLock();
  process.exit(0);
});

process.on('SIGINT', () => { });

process.on('SIGUSR1', async () => {
  const switchFile = path.join(config.getWyoyHome(), 'switch-request.json');
  if (!fs.existsSync(switchFile)) return;
  let switchTo;
  try {
    const req = JSON.parse(fs.readFileSync(switchFile, 'utf8'));
    switchTo = req.to;
    fs.unlinkSync(switchFile);
  } catch { return; }
  if (!activeManager) return;
  const session = sessionState.get();
  log.info(`\nVoluntary switch: ${session.engine} -> ${switchTo}`);
  await activeManager.gracefulKill();
  if (activeLogger) activeLogger.flush();
  let sessionMessages = [];
  if (session.engine === 'claude') {
    const cwdEncoded = process.cwd().replace(/\//g, '-').replace(/^-/, '');
    const projectDir = path.join(os.homedir(), '.claude', 'projects', cwdEncoded);
    if (fs.existsSync(projectDir)) {
      const files = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl')).sort();
      if (files.length > 0) {
        sessionMessages = await parseSessionFile(path.join(projectDir, files[files.length - 1]));
      }
    }
  }
  const ctx = await buildContext({
    engine: session.engine, errorClass: 'voluntary_switch', workMode: session.workMode,
    cwd: process.cwd(), startedAt: session.startedAt,
    stdoutLines: activeLogger ? activeLogger.getLastLines(50) : [], sessionMessages,
  });
  const promptText = renderHandoff(ctx);
  const handoffFile = writeHandoffFile(promptText);
  sessionState.recordHandoff(session.engine, switchTo, 'voluntary_switch');
  const result = await startEngine(switchTo, session.workMode, handoffFile);
  while (result && result.errorClass !== 'normal_exit') {
    const next = await handleFailover(result);
    if (!next) break;
    Object.assign(result, next);
  }
  sessionState.clear();
  sessionState.releaseLock();
  process.exit(0);
});

program.parse();
