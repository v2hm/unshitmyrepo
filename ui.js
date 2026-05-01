const inquirer = require('inquirer');
const chalk = require('chalk');
const git = require('./git');
const { banner, createSpinner, success, warn, error, info, separator, showCommitBox } = require('./utils');

async function confirm(message, defaultVal = false) {
  const { ok } = await inquirer.prompt([{
    type: 'confirm',
    name: 'ok',
    message,
    default: defaultVal,
  }]);
  return ok;
}

async function commitAndPush(defaultMessage) {
  const { message } = await inquirer.prompt([{
    type: 'input',
    name: 'message',
    message: 'Mensagem do commit:',
    default: defaultMessage || '',
    validate: v => v.trim() ? true : 'A mensagem não pode ser vazia.',
  }]);

  const commitSpinner = createSpinner('Commitando...');
  await sleep(600);
  const commitResult = git.runSafe(`git commit -m "${message.replace(/"/g, '\\"')}"`);
  if (!commitResult.ok) {
    commitSpinner.stop(false, 'Falha ao commitar');
    error('Detalhes: ' + commitResult.error);
    return;
  }
  commitSpinner.stop(true, 'Commit criado!');

  const upstream = git.detectUpstream();
  if (!upstream) {
    warn('Não encontrei um remote configurado. As alterações ficaram commitadas localmente.');
    info('Para subir manualmente: git push');
    return;
  }

  const pushSpinner = createSpinner(`Subindo para ${upstream}...`);
  await sleep(400);
  pushSpinner.stop(true, 'Enviando...');

  const remote = upstream.split('/')[0];
  const branch = upstream.split('/').slice(1).join('/');
  const pushResult = git.runPush(['push', remote, branch]);

  if (!pushResult.ok) {
    error('Push falhou. Suas alterações estão commitadas localmente. Tente: git push');
  } else {
    success('Alterações commitadas e enviadas com sucesso!');
  }
}

// ─── Feature 1: Desfazer último commit ────────────────────────────────────────

async function undoLastCommit() {
  console.clear();
  console.log(chalk.bold('\n🔙  Desfazer último commit\n'));

  const lastCommit = git.getLastCommit();
  if (!lastCommit) {
    error('Não encontrei nenhum commit nesse repositório.');
    return;
  }

  showCommitBox(lastCommit.hash, lastCommit.message, lastCommit.date, lastCommit.author);

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'O que você quer fazer?',
    choices: [
      { name: chalk.green('✅  Desfazer o commit mas manter meus arquivos (recomendado)'), value: 'soft' },
      { name: chalk.red('💥  Apagar o commit E todas as alterações (perigo!)'), value: 'hard' },
      { name: chalk.gray('← Voltar'), value: 'back' },
    ],
  }]);

  if (action === 'back') return;

  if (action === 'hard') {
    warn('Isso vai apagar permanentemente as alterações desse commit.');
    const sure = await confirm('Você tem certeza absoluta?', false);
    if (!sure) {
      info('Operação cancelada. Nada foi alterado.');
      return;
    }
  }

  const spinner = createSpinner('Criando backup de segurança...');
  await sleep(600);
  const backupName = git.createBackup();
  spinner.stop(!!backupName, backupName ? `Backup criado: ${backupName}` : 'Sem commits para backup ainda');

  const spinner2 = createSpinner('Desfazendo o commit...');
  await sleep(800);

  const result = action === 'soft' ? git.undoLastCommitSoft() : git.undoLastCommitHard();

  if (!result.ok) {
    spinner2.stop(false, 'Não consegui desfazer o commit');
    error('Detalhes: ' + result.error);
    return;
  }

  spinner2.stop(true, 'Commit desfeito com sucesso!');

  if (action === 'soft') {
    success('Seus arquivos continuam intactos e prontos para commit.');

    const wantCommit = await confirm('Quer commitar e subir agora?', true);
    if (wantCommit) {
      await commitAndPush(lastCommit.message);
    } else {
      info('Ok! As alterações ficam staged esperando você. Commit quando quiser.');
    }
  } else {
    success('Commit e alterações apagados. O repo está como antes do commit.');
    if (backupName) {
      info(`Se arrependeu: git checkout ${backupName}`);
    }
  }
}

// ─── Feature 2: Desfazer push ─────────────────────────────────────────────────

async function undoPush() {
  console.clear();
  console.log(chalk.bold('\n💥  Desfazer um push\n'));

  const lastCommit = git.getLastCommit();
  if (!lastCommit) {
    error('Não encontrei nenhum commit nesse repositório.');
    return;
  }

  showCommitBox(lastCommit.hash, lastCommit.message, lastCommit.date, lastCommit.author);

  const upstream = git.detectUpstream();

  if (!upstream) {
    warn('Não encontrei um remote configurado para essa branch.');
    info('Verifique se você fez o push com: git push -u origin nome-da-branch');
    return;
  }

  info(`Remote detectado: ${chalk.cyan(upstream)}`);

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Como você quer reverter?',
    choices: [
      { name: chalk.green('✅  Criar um novo commit que desfaz as mudanças (seguro, histórico preservado)'), value: 'revert' },
      { name: chalk.red('💥  Forçar volta no histórico remoto (perigoso, reescreve o histórico)'), value: 'force' },
      { name: chalk.gray('← Voltar'), value: 'back' },
    ],
  }]);

  if (action === 'back') return;

  if (action === 'force') {
    warn('Isso reescreve o histórico remoto.\nSe outras pessoas clonaram ou trabalharam nessa branch, vai causar conflitos sérios.');
    const sure = await confirm('Você tem CERTEZA que quer forçar?', false);
    if (!sure) {
      info('Operação cancelada.');
      return;
    }
  }

  const backupSpinner = createSpinner('Criando backup de segurança...');
  await sleep(600);
  const backupName = git.createBackup();
  backupSpinner.stop(!!backupName, backupName ? `Backup criado: ${backupName}` : 'Backup pulado');

  if (action === 'revert') {
    const spinner = createSpinner('Criando commit de reversão...');
    await sleep(1000);
    const result = git.revertAndPush(upstream);
    if (!result.ok) {
      spinner.stop(false, 'Falha ao reverter');
      error('Detalhes: ' + result.error);
      return;
    }
    spinner.stop(true, 'Reversão enviada com sucesso!');
    success('Um novo commit foi criado desfazendo as mudanças e enviado para o remote.');
    info('O histórico está preservado. Ninguém vai ter problema de conflito.');
  } else {
    const spinner = createSpinner('Resetando e forçando push...');
    await sleep(1200);
    const result = git.forceReset(upstream);
    if (!result.ok) {
      spinner.stop(false, 'Falha no force push');
      error('Detalhes: ' + result.error);
      return;
    }
    spinner.stop(true, 'Force push concluído!');
    success('O histórico remoto foi reescrito.');
    if (backupName) {
      warn(`Se precisar recuperar: git checkout ${backupName}`);
    }
  }
}

// ─── Feature 3: Voltar para commit antigo ─────────────────────────────────────

async function goBackToCommit() {
  console.clear();
  console.log(chalk.bold('\n📜  Voltar para um commit antigo\n'));

  const commits = git.getRecentCommits(10);
  if (!commits.length) {
    error('Não encontrei commits nesse repositório.');
    return;
  }

  const choices = commits.map((c, i) => ({
    name: `${chalk.cyan(c.hash)}  ${chalk.white(c.message)}  ${chalk.gray(c.date)}`,
    value: c.hash,
  }));
  choices.push({ name: chalk.gray('← Voltar'), value: 'back' });

  const { hash } = await inquirer.prompt([{
    type: 'list',
    name: 'hash',
    message: 'Para qual commit você quer ir?',
    choices,
    pageSize: 12,
  }]);

  if (hash === 'back') return;

  const chosen = commits.find(c => c.hash === hash);
  info(`Commit escolhido: ${chalk.cyan(hash)} — "${chosen.message}"`);

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'O que você quer fazer a partir desse commit?',
    choices: [
      { name: chalk.green('✅  Criar uma nova branch a partir daqui (mais seguro)'), value: 'branch' },
      { name: chalk.yellow('⚠️   Voltar mas manter as alterações dos commits seguintes (staged)'), value: 'soft' },
      { name: chalk.red('💥  Apagar tudo que veio depois desse commit (perigo!)'), value: 'hard' },
      { name: chalk.gray('← Voltar'), value: 'back' },
    ],
  }]);

  if (action === 'back') return;

  if (action === 'hard') {
    warn('Isso vai apagar permanentemente todos os commits e alterações posteriores a esse ponto.');
    const sure = await confirm('Tem certeza?', false);
    if (!sure) {
      info('Operação cancelada.');
      return;
    }
  }

  const backupSpinner = createSpinner('Criando backup de segurança...');
  await sleep(600);
  const backupName = git.createBackup();
  backupSpinner.stop(!!backupName, backupName ? `Backup criado: ${backupName}` : 'Backup pulado');

  if (action === 'branch') {
    const timestamp = Math.floor(Date.now() / 1000);
    const newBranch = `recovery-${hash}-${timestamp}`;
    const spinner = createSpinner(`Criando branch ${newBranch}...`);
    await sleep(800);
    const result = git.checkoutNewBranchFromCommit(newBranch, hash);
    if (!result.ok) {
      spinner.stop(false, 'Falha ao criar branch');
      error('Detalhes: ' + result.error);
      return;
    }
    spinner.stop(true, `Branch criada: ${newBranch}`);
    success(`Você está agora na branch "${newBranch}", a partir do commit ${hash}.`);
    info('Seus arquivos originais continuam seguros na branch anterior.');

  } else if (action === 'soft') {
    const spinner = createSpinner('Voltando para o commit (mantendo alterações)...');
    await sleep(900);
    const result = git.resetToCommitSoft(hash);
    if (!result.ok) {
      spinner.stop(false, 'Falha ao resetar');
      error('Detalhes: ' + result.error);
      return;
    }
    spinner.stop(true, 'Voltou para o commit!');
    success('Você está no commit escolhido. As alterações dos commits seguintes estão "prontas para commit".');

  } else {
    const spinner = createSpinner('Apagando histórico posterior...');
    await sleep(1000);
    const result = git.resetToCommitHard(hash);
    if (!result.ok) {
      spinner.stop(false, 'Falha ao resetar');
      error('Detalhes: ' + result.error);
      return;
    }
    spinner.stop(true, 'Histórico apagado até o ponto escolhido!');
    success('O repositório está exatamente como estava nesse commit.');
    if (backupName) {
      warn(`Se arrependeu: git checkout ${backupName}`);
    }
  }
}

// ─── Feature 4: Recuperar branch deletada ─────────────────────────────────────

async function recoverBranch() {
  console.clear();
  console.log(chalk.bold('\n🌿  Recuperar uma branch deletada\n'));

  const { branchName } = await inquirer.prompt([{
    type: 'input',
    name: 'branchName',
    message: 'Qual era o nome da branch que você deletou?',
    validate: v => v.trim() ? true : 'Digite o nome da branch.',
  }]);

  const spinner = createSpinner('Vasculhando o histórico do Git...');
  await sleep(1000);

  const reflog = git.getReflog(50);
  spinner.stop(true, 'Histórico analisado!');

  const filtered = reflog.filter(e =>
    e.action.includes(branchName) ||
    e.action.includes('checkout') ||
    e.action.includes('branch')
  );

  const candidates = filtered.length ? filtered : reflog.slice(0, 15);

  if (!candidates.length) {
    error('Não encontrei rastros dessa branch no histórico.');
    info('Infelizmente, se o repositório foi deletado há muito tempo e o Git já limpou o reflog, não é possível recuperar.');
    return;
  }

  info(`Encontrei ${candidates.length} entrada(s) relevante(s) no histórico:`);

  const choices = candidates.map(c => ({
    name: `${chalk.cyan(c.hash)}  ${chalk.white(c.action)}  ${chalk.gray(c.date)}`,
    value: c.hash,
  }));
  choices.push({ name: chalk.gray('← Voltar'), value: 'back' });

  const { hash } = await inquirer.prompt([{
    type: 'list',
    name: 'hash',
    message: 'Qual desses parece ser o último commit da branch deletada?',
    choices,
    pageSize: 12,
  }]);

  if (hash === 'back') return;

  const recoveredName = `${branchName}-recovered`;
  const recoverSpinner = createSpinner(`Recriando branch "${recoveredName}"...`);
  await sleep(800);

  const result = git.recoverDeletedBranch(recoveredName, hash);
  if (!result.ok) {
    recoverSpinner.stop(false, 'Falha ao recriar a branch');
    error('Detalhes: ' + result.error);
    return;
  }

  recoverSpinner.stop(true, `Branch "${recoveredName}" recriada!`);
  success(`A branch foi recuperada como "${recoveredName}".`);
  info(`Confira o conteúdo e renomeie com: git branch -m ${recoveredName} ${branchName}`);
}

// ─── Feature 5: Não sei o que fiz ─────────────────────────────────────────────

async function iDontKnow() {
  console.clear();
  console.log(chalk.bold('\n🧠  Deixa eu ver o que aconteceu...\n'));

  const spinner = createSpinner('Analisando o histórico do repo...');
  await sleep(1000);

  const commits = git.getRecentCommits(5);
  const lastCommit = commits[0];
  spinner.stop(true, 'Análise concluída!');

  if (!commits.length) {
    warn('Esse repositório não tem nenhum commit ainda.');
    return;
  }

  console.log(chalk.bold('\n📋  Últimos commits:\n'));
  commits.forEach((c, i) => {
    const prefix = i === 0 ? chalk.yellow('→ ') : chalk.gray('  ');
    console.log(`${prefix}${chalk.cyan(c.hash)}  ${chalk.white(c.message)}  ${chalk.gray(c.date)}`);
  });

  console.log('');

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'O que você quer fazer?',
    choices: [
      { name: chalk.green('✅  Desfazer o último commit (mas manter os arquivos)'), value: 'undo' },
      { name: chalk.cyan('🌿  Criar uma branch segura a partir de agora'), value: 'branch' },
      { name: chalk.yellow('📜  Ver commits e escolher onde voltar'), value: 'commits' },
      { name: chalk.gray('← Voltar'), value: 'back' },
    ],
  }]);

  if (action === 'back') return;

  if (action === 'undo') {
    return undoLastCommit();
  }

  if (action === 'commits') {
    return goBackToCommit();
  }

  if (action === 'branch') {
    const timestamp = Math.floor(Date.now() / 1000);
    const safeName = `safe-point-${timestamp}`;
    const spinner2 = createSpinner(`Criando branch segura "${safeName}"...`);
    await sleep(700);
    const result = git.createBackup();
    spinner2.stop(!!result, result ? `Branch "${result}" criada!` : 'Não foi possível criar a branch');
    if (result) {
      success('Você tem um ponto seguro salvo.');
      info(`Para voltar a esse estado a qualquer momento: git checkout ${result}`);
    }
  }
}

// ─── Menu principal ────────────────────────────────────────────────────────────

async function mainMenu() {
  banner();
  const { choice } = await inquirer.prompt([{
    type: 'list',
    name: 'choice',
    message: chalk.bold('😬  O que aconteceu?'),
    choices: [
      { name: chalk.yellow('1.') + '  Fiz um commit errado', value: 'commit' },
      { name: chalk.yellow('2.') + '  Fiz um push errado', value: 'push' },
      { name: chalk.yellow('3.') + '  Quero voltar para um commit antigo', value: 'old' },
      { name: chalk.yellow('4.') + '  Deletei uma branch sem querer', value: 'branch' },
      { name: chalk.yellow('5.') + '  Não sei o que fiz 😭', value: 'dunno' },
      new inquirer.Separator(),
      { name: chalk.gray('Sair'), value: 'exit' },
    ],
  }]);

  separator();

  switch (choice) {
    case 'commit': await undoLastCommit(); break;
    case 'push':   await undoPush(); break;
    case 'old':    await goBackToCommit(); break;
    case 'branch': await recoverBranch(); break;
    case 'dunno':  await iDontKnow(); break;
    case 'exit':
      console.log(chalk.cyan('\nAté a próxima! 👋\n'));
      process.exit(0);
  }

  separator();
  console.log('');

  const { again } = await inquirer.prompt([{
    type: 'confirm',
    name: 'again',
    message: 'Quer resolver mais alguma coisa?',
    default: false,
  }]);

  if (again) {
    console.log('');
    return mainMenu();
  }

  console.log(chalk.cyan('\nAté a próxima! 👋\n'));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { mainMenu };
