import { execFileSync } from 'node:child_process';
import { lstat, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { digest, fail } from './artifacts.mjs';

const git = (root, argv) => execFileSync('git', ['-C', root, ...argv], { maxBuffer: 100 * 1024 * 1024 });
const text = (root, argv) => git(root, argv).toString('utf8').trim();
export async function snapshot(repos) {
  if (!Array.isArray(repos) || !repos.length) fail('Snapshot requires explicit repository roots.');
  const result = [];
  for (const input of repos) {
    const root = await realpath(input);
    if (await realpath(text(root, ['rev-parse', '--show-toplevel'])) !== root) fail(`Not a repo root: ${root}`);
    const branch = text(root, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
    const paths = git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.', ':!make-it-work']).toString('utf8').split('\0').filter(Boolean).sort();
    const untracked = [];
    for (const file of paths) {
      const absolute = path.join(root, file);
      const info = await lstat(absolute);
      // Git hashes link text, not a possibly escaping target.
      const hash = info.isSymbolicLink() ? digest(await readlink(absolute)) : text(root, ['hash-object', '--', file]);
      untracked.push({ file, mode: info.mode & 0o777, hash });
    }
    result.push({ root, branch, head: text(root, ['rev-parse', 'HEAD']),
      fingerprint: digest(Buffer.concat([git(root, ['diff', '--binary', '--no-ext-diff', 'HEAD', '--', '.', ':!make-it-work']), Buffer.from(JSON.stringify(untracked))])) });
  }
  result.sort((a, b) => a.root.localeCompare(b.root));
  if (new Set(result.map((repo) => repo.root)).size !== result.length) fail('Duplicate repository root.');
  return result;
}
