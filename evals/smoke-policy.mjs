import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Shared by worktrees through git-common-dir, independently of report cleanup.
export async function beginSmoke({ directory, pr, ready, retryFailed, names, commit, report }) {
  if (!/^[1-9]\d*$/.test(pr ?? '')) throw new Error('Smoke requires --pr=NUMBER (the draft PR number).');
  if (!ready) throw new Error('Run smoke only when implementation, review and deterministic checks are complete; pass --ready.');
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `pr-${pr}.json`);
  const lock = `${file}.lock`;
  try { await mkdir(lock); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new Error(`Smoke for PR #${pr} is already locked. If its process was killed, verify it has stopped before removing ${lock}.`);
  }
  const release = () => rm(lock, { recursive: true, force: true });
  try {
    let state;
    try { state = JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (state && !retryFailed) throw new Error(`PR #${pr} already started its full smoke run. Fix failures, then use smoke --pr=${pr} --ready --retry-failed. Ledger: ${file}`);
    if (!state && retryFailed) throw new Error(`PR #${pr} has no initial smoke run. Omit --retry-failed.`);
    if (state && (state.version !== 1 || state.pr !== pr || JSON.stringify(state.names) !== JSON.stringify(names))) {
      throw new Error(`Smoke inventory or ledger changed for PR #${pr}; inspect ${file} rather than silently starting another suite.`);
    }
    state ??= { version: 1, pr, names, cases: {}, attempts: [] };
    const selected = names.filter(name => state.cases[name]?.status !== 'passed');
    if (!selected.length) throw new Error(`PR #${pr}: all smoke cases already passed. No model run needed. Ledger: ${file}`);
    const attempt = { commit, report, selected, startedAt: new Date().toISOString(), status: 'running' };
    state.attempts.push(attempt);
    const save = async () => {
      await writeFile(`${file}.tmp`, JSON.stringify(state, null, 2) + '\n');
      await rename(`${file}.tmp`, file);
    };
    // Reserve the full run before any model call. Interrupted runs can only resume.
    await save();
    return { file, lock, selected, release,
      async record(result, repoUnchanged) {
        if (!selected.includes(result.name)) throw new Error('Cannot record an unselected smoke case.');
        state.cases[result.name] = { status: repoUnchanged && result.status === 'passed' ? 'passed' : 'failed', commit, report };
        state.passed = names.every(name => state.cases[name]?.status === 'passed');
        await save();
      },
      async finish(summary) {
        for (const name of selected) {
          const result = summary.cases.find(entry => entry.name === name);
          state.cases[name] = { status: summary.repoUnchanged && result?.status === 'passed' ? 'passed' : 'failed', commit, report };
        }
        attempt.status = summary.selectionComplete && summary.repoUnchanged ? 'completed' : 'incomplete';
        attempt.completedAt = summary.completedAt;
        attempt.costUsd = summary.costUsd;
        state.passed = names.every(name => state.cases[name]?.status === 'passed');
        await save();
        return state.passed;
      },
    };
  } catch (error) { await release(); throw error; }
}
