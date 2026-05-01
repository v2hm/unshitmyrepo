#!/usr/bin/env node

const chalk = require('chalk');
const { checkGit, checkRepo } = require('./git');
const { mainMenu } = require('./ui');
const { banner, error } = require('./utils');

async function main() {
  banner();

  if (!checkGit()) {
    error('Git não encontrado. Instale o Git antes de usar essa ferramenta.');
    console.log(chalk.gray('  → https://git-scm.com/downloads\n'));
    process.exit(1);
  }

  if (!checkRepo()) {
    error('Você não está dentro de um repositório Git.');
    console.log(chalk.gray('  → Entre em uma pasta que tenha um repo Git, ou rode: git init\n'));
    process.exit(1);
  }

  await mainMenu();
}

main().catch(err => {
  if (err && err.isTtyError) {
    console.error(chalk.red('\nEsse terminal não suporta menus interativos.'));
  } else if (err && err.message && err.message.includes('force closed')) {
    console.log(chalk.cyan('\nAté a próxima! 👋\n'));
  } else {
    console.error(chalk.red('\nAlgo inesperado aconteceu:'), err && err.message ? err.message : err);
  }
  process.exit(0);
});
