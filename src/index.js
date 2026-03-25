'use strict';

const { Command } = require('commander');
const pkg = require('../package.json');

const program = new Command();

program
  .name('wyoy')
  .description('Work Yes Or Yes - AI engine failover CLI')
  .version(pkg.version)
  .option('--engine <engine>', 'Start with specific engine (claude or gemini)')
  .action(async (options) => {
    console.log(`WYOY v${pkg.version}`);
    // TODO: wire up session init
  });

program.parse();
