import { spawnSync } from 'node:child_process';
import { lstat, readFile, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}
export async function ensureArtifactIgnored(directory) {
  // Find an existing parent without creating unprotected artifacts.
  let existing = path.resolve(directory);
  while (true) {
    try { await lstat(existing); break; } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(existing); if (parent === existing) throw error; existing = parent;
    }
  }
  if ((await lstat(existing)).isSymbolicLink()) throw new Error('Artifact root must be a real directory, not a symlink.');
  const top = git(existing, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) {
    if (!/not a git repository/i.test(top.stderr)) throw new Error(`Cannot inspect artifact Git worktree: ${top.stderr}`);
    return { applicable: false, notice: 'Not a Git repository; artifact Git protection is not applicable.' };
  }
  const root = await realpath(top.stdout.trim());
  const canonicalDirectory = path.resolve(await realpath(existing), path.relative(existing, path.resolve(directory)));
  const relative = path.relative(root, canonicalDirectory).split(path.sep).join('/');
  if (!relative || relative.startsWith('../')) throw new Error('Artifact directory must be inside its Git worktree.');
  const tracked = git(root, ['ls-files', '-z', '--', `:(literal)${relative}`]);
  if (tracked.status !== 0) throw new Error(tracked.stderr);
  if (tracked.stdout) throw new Error(`Workflow artifacts are already staged or tracked: ${tracked.stdout.split('\0').filter(Boolean).join(', ')}. Remove them from the index with git rm --cached (preserving local files), then retry. Already committed artifacts also require reviewing outgoing history.`);
  // Repo/workspace-local sessions are private storage, already covered by
  // their exact session exclusion; never append to the source .gitignore.
  if (/(?:^|\/)\.claude\/(?:miw-sessions|worktrees)\/[^/]+\/make-it-work$/.test(relative)) {
    if (git(root, ['check-ignore', '--no-index', '-q', '--', `${relative}/miw-ignore-probe`]).status !== 0) throw new Error('Private session artifacts are no longer ignored; repair their local exclusion before writing.');
    return { applicable: true, root, relative };
  }
  const ignore = path.join(root, '.gitignore');
  let text = '';
  try { if (!(await lstat(ignore)).isFile() || (await lstat(ignore)).isSymbolicLink()) throw new Error('.gitignore must be a regular file.'); text = await readFile(ignore, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const escaped = relative.replace(/[\\*?\[\]#! ]/g, '\\$&'), rule = `/${escaped}/`;
  const probe = `${relative}/miw-ignore-probe`;
  const effective = git(root, ['check-ignore', '--no-index', '-v', '--', probe]);
  const source = effective.stdout.split(':')[0];
  const pattern = effective.stdout.match(/^.*?:\d+:(.*?)\t/)?.[1] ?? '';
  const locallyIgnored = effective.status === 0 && pattern.endsWith('/') && !pattern.startsWith('!') && !path.isAbsolute(source) && source.endsWith('.gitignore') && git(root, ['check-ignore', '--no-index', '-q', '--', probe]).status === 0;
  if (!locallyIgnored) {
    const newline = text.includes('\r\n') ? '\r\n' : '\n';
    await writeFile(ignore, text + (text && !text.endsWith('\n') ? newline : '') + rule + newline);
  }
  if (git(root, ['check-ignore', '--no-index', '-q', '--', probe]).status !== 0) throw new Error(`Git does not ignore ${relative}; resolve conflicting ignore rules.`);
  return { applicable: true, root, relative };
}
export function assertNoOutgoingArtifacts(root, head = 'HEAD') {
  const refs = git(root, ['for-each-ref', '--format=%(refname)', 'refs/remotes/origin/']);
  if (refs.status !== 0 || !refs.stdout.trim()) throw new Error('Cannot establish outgoing commits: origin remote refs are unavailable. Fetch origin and retry.');
  const commits = git(root, ['rev-list', head, '--not', ...refs.stdout.trim().split('\n')]);
  if (commits.status !== 0) throw new Error('Cannot establish outgoing commit range.');
  for (const commit of commits.stdout.trim().split('\n').filter(Boolean)) {
    const changes = git(root, ['diff-tree', '--root', '-m', '--no-commit-id', '--name-only', '-r', '-z', commit]);
    if (changes.status !== 0) throw new Error(`Cannot inspect outgoing commit ${commit}.`);
    const files = changes.stdout.split('\0').filter(file => /(^|\/)make-it-work(?:\/|$)/.test(file));
    if (files.length) throw new Error(`Outgoing commit ${commit} contains workflow artifacts: ${files.join(', ')}. Clean up outgoing history before delivery.`);
  }
}

export async function protectArtifact(file) {
  const absolute = path.resolve(String(file)), parts = absolute.split(path.sep), index = parts.lastIndexOf('make-it-work');
  if (index < 0 || index === parts.length - 1) return;
  const directory = parts.slice(0, index + 1).join(path.sep) || path.sep;
  for (const name of ['.claude-plugin', '.git']) {
    try { await lstat(path.join(directory, name)); return; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return ensureArtifactIgnored(directory);
}
