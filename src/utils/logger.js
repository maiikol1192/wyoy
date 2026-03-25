'use strict';

const chalk = require('chalk');

const PREFIX = chalk.cyan('[WYOY]');

function info(msg) {
  console.log(`${PREFIX} ${msg}`);
}

function warn(msg) {
  console.log(`${PREFIX} ${chalk.yellow(msg)}`);
}

function error(msg) {
  console.error(`${PREFIX} ${chalk.red(msg)}`);
}

function success(msg) {
  console.log(`${PREFIX} ${chalk.green(msg)}`);
}

function banner(version) {
  console.log('');
  console.log(chalk.bold(`  WYOY v${version}`) + chalk.dim(' — Work Yes Or Yes'));
  console.log(chalk.dim('  Never stop working.'));
  console.log('');
}

function box(lines) {
  const maxLen = Math.max(...lines.map((l) => l.length));
  const border = '+' + '-'.repeat(maxLen + 4) + '+';
  console.log(border);
  for (const line of lines) {
    console.log(`|  ${line.padEnd(maxLen + 2)}|`);
  }
  console.log(border);
}

module.exports = { info, warn, error, success, banner, box };
