import { mkdtemp, readFile, rm, appendFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { git, hash, verifyPackage } from './package.mjs';

const branch = 'anthropic-release';
const bot = { GIT_AUTHOR_NAME: 'github-actions[bot]', GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com', GIT_COMMITTER_NAME: 'github-actions[bot]', GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com' };

export async function publishPackage({ repo, output, report }) {
  repo = path.resolve(repo); output = path.resolve(output);
  await verifyPackage(output, report);
  const remoteRefs = () => Object.fromEntries(git(repo, 'ls-remote', 'origin', 'refs/heads/main', `refs/heads/${branch}`).toString().trim().split('\n').filter(Boolean).map((line) => { const [sha, ref] = line.split('\t'); return [ref, sha]; }));
  const refs = remoteRefs();
  if (refs['refs/heads/main'] !== report.sourceSha) return { status: 'superseded', sourceSha: report.sourceSha };
  const previous = refs[`refs/heads/${branch}`];
  const warnings = [];
  if (previous) {
    git(repo, 'fetch', '--no-tags', 'origin', `refs/heads/${branch}`);
    const message = git(repo, 'show', '-s', '--format=%B', previous).toString();
    const tree = git(repo, 'rev-parse', `${previous}^{tree}`).toString().trim();
    const committer = git(repo, 'show', '-s', '--format=%ce', previous).toString().trim();
    if (committer !== bot.GIT_COMMITTER_EMAIL || !/^Anthropic-Source: [a-f0-9]{40}$/m.test(message) || !message.includes(`Anthropic-Tree: ${tree}\n`)) throw new Error('Release branch has unexpected changes. Refusing to overwrite it.');
    const previousVersion = JSON.parse(git(repo, 'show', `${previous}:.claude-plugin/plugin.json`)).version;
    const runtimeFiles = report.files.filter((e) => /^(skills|scripts|commands)\//.test(e.path));
    const oldFiles = git(repo, 'ls-tree', '-r', '--name-only', previous).toString().trim().split('\n').filter((p) => /^(skills|scripts|commands)\//.test(p));
    const runtimeChanged = oldFiles.length !== runtimeFiles.length || runtimeFiles.some((entry) => {
      try { return hash(git(repo, 'show', `${previous}:${entry.path}`)) !== entry.sha256; } catch { return true; }
    });
    if (previousVersion === report.version && runtimeChanged) warnings.push('Runtime changed without a version bump; installed-plugin caching may retain the previous runtime.');
  }
  const temp = await mkdtemp(path.join(os.tmpdir(), 'miw-publish-'));
  try {
    const env = { ...process.env, ...bot, GIT_INDEX_FILE: path.join(temp, 'index') };
    const run = (...args) => execFileSync('git', ['--git-dir', git(repo, 'rev-parse', '--absolute-git-dir').toString().trim(), '--work-tree', output, ...args], { env, maxBuffer: 64 * 1024 * 1024 }).toString().trim();
    run('read-tree', '--empty'); run('add', '--all', '--force'); const tree = run('write-tree');
    const committed = git(repo, 'ls-tree', '-rz', tree).toString().split('\0').filter(Boolean).map((line) => {
      const [header, file] = line.split('\t'), [mode, , object] = header.split(' ');
      return { path: file, mode, sha256: hash(git(repo, 'cat-file', 'blob', object)) };
    }).sort((a, b) => a.path.localeCompare(b.path, 'en'));
    if (JSON.stringify(committed) !== JSON.stringify(report.files.map(({ path, mode, sha256 }) => ({ path, mode, sha256 })))) throw new Error('Git staging changed the verified package. Refusing to publish.');
    if (previous && tree === git(repo, 'rev-parse', `${previous}^{tree}`).toString().trim()) return { status: 'unchanged', sourceSha: report.sourceSha, releaseSha: previous, tree };
    const commit = run('commit-tree', tree, ...(previous ? ['-p', previous] : []), '-m', `Anthropic runtime ${report.version}\n\nAnthropic-Source: ${report.sourceSha}\nAnthropic-Tree: ${tree}\nAnthropic-Package: ${report.packageDigest}\n`);
    const latest = remoteRefs();
    if (latest['refs/heads/main'] !== report.sourceSha) return { status: 'superseded', sourceSha: report.sourceSha };
    if (latest[`refs/heads/${branch}`] !== previous) throw new Error('Release branch advanced during publication. Retry the workflow.');
    // Ordinary fast-forward push; no force flag and no other destination ref.
    git(repo, '-c', 'core.hooksPath=/dev/null', 'push', 'origin', `${commit}:refs/heads/${branch}`);
    if (remoteRefs()[`refs/heads/${branch}`] !== commit) throw new Error('Remote publication could not be verified.');
    return { status: 'published', sourceSha: report.sourceSha, releaseSha: commit, tree, warnings };
  } finally { await rm(temp, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [output, reportFile] = process.argv.slice(2);
  try {
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    const result = await publishPackage({ repo: '.', output, report });
    console.log(JSON.stringify(result, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `### Anthropic distribution\n\nStatus: **${result.status}**\n\nSource: \`${result.sourceSha}\`\n\nRelease: \`${result.releaseSha || 'not advanced'}\`\n\nVersion: ${report.version}; ${report.summary.files} files, ${report.summary.entries} entries.\n\n${(result.warnings || []).join('\n\n')}\n\nDirectory approval is separate from package publication.\n`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
