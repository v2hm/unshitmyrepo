const chalk = require('chalk');

const BANNER = `
${chalk.red('█░█ █▄░█ █▀ █░█ █ ▀█▀')}
${chalk.red('█▄█ █░▀█ ▄█ █▀█ █ ░█░')}
${chalk.yellow('█▀▄▀█ █▄█   █▀█ █▀▀ █▀█ █▀█')}
${chalk.yellow('█░▀░█ ░█░   █▀▄ ██▄ █▀▀ █▄█')}
${chalk.gray('────────────────────────────────')}
${chalk.gray('  Desfaça erros no Git sem drama')}
${chalk.gray('────────────────────────────────')}
`;

const SPINNER_FRAMES = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

const GIT_ANIMATIONS = [
  ['  [=       ]', '  [==      ]', '  [===     ]', '  [====    ]', '  [=====   ]', '  [======  ]', '  [======= ]', '  [========]', '  [ =======]', '  [  ======]', '  [   =====]', '  [    ====]', '  [     ===]', '  [      ==]', '  [       =]', '  [        ]'],
];

function banner() {
  console.clear();
  console.log(BANNER);
}

function createSpinner(message) {
  let i = 0;
  let animI = 0;
  const interval = setInterval(() => {
    const spin = chalk.cyan(SPINNER_FRAMES[i % SPINNER_FRAMES.length]);
    const bar = chalk.yellow(GIT_ANIMATIONS[0][animI % GIT_ANIMATIONS[0].length]);
    process.stdout.write(`\r${spin} ${chalk.bold(message)} ${bar}`);
    i++;
    animI++;
  }, 80);

  return {
    stop(success = true, doneMsg) {
      clearInterval(interval);
      const clearLine = '\r' + ' '.repeat(process.stdout.columns || 80) + '\r';
      process.stdout.write(clearLine);
      if (success) {
        console.log(chalk.green('✅ ') + chalk.bold(doneMsg || message));
      } else {
        console.log(chalk.red('❌ ') + chalk.bold(doneMsg || message));
      }
    },
  };
}

function success(msg) {
  console.log(chalk.green('\n✅  ' + msg));
}

function warn(msg) {
  console.log(chalk.yellow('\n⚠️   ' + msg));
}

function error(msg) {
  console.log(chalk.red('\n❌  ' + msg));
}

function info(msg) {
  console.log(chalk.cyan('\nℹ️   ' + msg));
}

function separator() {
  console.log(chalk.gray('\n' + '─'.repeat(50)));
}

function showCommitBox(hash, message, date, author) {
  console.log(chalk.gray('\n┌─────────────────────────────────────────┐'));
  console.log(chalk.gray('│') + chalk.bold(' Último commit:'));
  console.log(chalk.gray('│') + chalk.cyan('  ' + hash) + chalk.gray(' · ') + chalk.white(message));
  if (author) console.log(chalk.gray('│') + chalk.gray('  por ' + author + ' · ' + date));
  console.log(chalk.gray('└─────────────────────────────────────────┘\n'));
}

module.exports = { banner, createSpinner, success, warn, error, info, separator, showCommitBox };
