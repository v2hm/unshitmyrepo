const { execSync, spawnSync } = require('child_process');

function run(cmd) {
  return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

// Usado para push: herda o terminal inteiro para git autenticar e mostrar progresso
function runPush(args) {
  const result = spawnSync('git', args, { stdio: 'inherit' });
  return { ok: result.status === 0 };
}

function runSafe(cmd) {
  try {
    return { ok: true, output: run(cmd) };
  } catch (e) {
    return { ok: false, error: e.stderr || e.message || String(e) };
  }
}

function checkGit() {
  const result = runSafe('git --version');
  return result.ok;
}

function checkRepo() {
  const result = runSafe('git rev-parse --is-inside-work-tree');
  return result.ok && result.output === 'true';
}

function createBackup() {
  const timestamp = Math.floor(Date.now() / 1000);
  const name = `backup-before-unshit-${timestamp}`;
  const result = runSafe(`git branch ${name}`);
  if (!result.ok) {
    // might be in detached HEAD or no commits yet
    return null;
  }
  return name;
}

function getLastCommit() {
  const result = runSafe('git log -1 --pretty=format:"%h|%s|%cr|%an"');
  if (!result.ok || !result.output) return null;
  const [hash, message, date, author] = result.output.split('|');
  return { hash, message, date, author };
}

function getRecentCommits(n = 10) {
  const result = runSafe(`git log --pretty=format:"%h|%s|%cr" -n ${n}`);
  if (!result.ok || !result.output) return [];
  return result.output.split('\n').map(line => {
    const [hash, message, date] = line.split('|');
    return { hash, message: message || '(sem mensagem)', date: date || '' };
  });
}

function detectUpstream() {
  const result = runSafe('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
  if (!result.ok) return null;
  return result.output;
}

function getCurrentBranch() {
  const result = runSafe('git rev-parse --abbrev-ref HEAD');
  if (!result.ok) return null;
  return result.output;
}

function getReflog(n = 30) {
  const result = runSafe(`git reflog --pretty=format:"%h|%gs|%cr" -n ${n}`);
  if (!result.ok || !result.output) return [];
  return result.output.split('\n').map(line => {
    const parts = line.split('|');
    const hash = parts[0];
    const action = parts[1] || '';
    const date = parts[2] || '';
    return { hash, action, date };
  });
}

function undoLastCommitSoft() {
  return runSafe('git reset --soft HEAD~1');
}

function undoLastCommitHard() {
  return runSafe('git reset --hard HEAD~1');
}

function revertAndPush(upstream) {
  const revert = runSafe('git revert HEAD --no-edit');
  if (!revert.ok) return revert;
  const remote = upstream ? upstream.split('/')[0] : 'origin';
  const branch = upstream ? upstream.split('/').slice(1).join('/') : getCurrentBranch();
  return runPush(['push', remote, branch]);
}

function forceReset(upstream) {
  const reset = runSafe('git reset --hard HEAD~1');
  if (!reset.ok) return reset;
  const remote = upstream ? upstream.split('/')[0] : 'origin';
  const branch = upstream ? upstream.split('/').slice(1).join('/') : getCurrentBranch();
  return runPush(['push', remote, branch, '--force']);
}

function resetToCommitSoft(hash) {
  return runSafe(`git reset --soft ${hash}`);
}

function resetToCommitHard(hash) {
  return runSafe(`git reset --hard ${hash}`);
}

function checkoutNewBranchFromCommit(branchName, hash) {
  return runSafe(`git checkout -b ${branchName} ${hash}`);
}

function recoverDeletedBranch(branchName, hash) {
  return runSafe(`git checkout -b ${branchName} ${hash}`);
}

function hasCommits() {
  const result = runSafe('git log -1');
  return result.ok;
}

module.exports = {
  run,
  runSafe,
  runPush,
  checkGit,
  checkRepo,
  createBackup,
  getLastCommit,
  getRecentCommits,
  detectUpstream,
  getCurrentBranch,
  getReflog,
  undoLastCommitSoft,
  undoLastCommitHard,
  revertAndPush,
  forceReset,
  resetToCommitSoft,
  resetToCommitHard,
  checkoutNewBranchFromCommit,
  recoverDeletedBranch,
  hasCommits,
};
