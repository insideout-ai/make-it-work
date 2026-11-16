#!/usr/bin/env node
import { lstat, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, cli, within } from './lib/artifacts.mjs';
import { artifactOutputJoin, namingVersion, prefixed } from './lib/artifact-path.mjs';
import { ensureArtifactIgnored } from './lib/artifact-git.mjs';

// Resolve before a skill writes prose: filenames are decided by the same code as deterministic writers.
export async function resolveArtifactOutput({ root, directory, name }) {
  root = await realpath(root);
  if (typeof name !== 'string' || !name || name !== path.basename(name) || ['.', '..'].includes(name)) throw new Error('Artifact name must be a plain filename.');
  const base = path.join(root, 'make-it-work');
  const destination = path.resolve(root, directory ?? 'make-it-work');
  if (destination !== base && !destination.startsWith(base + path.sep)) throw new Error('Artifact output must be under make-it-work.');
  const gitProtection = await ensureArtifactIgnored(base);
  let current = root;
  for (const part of path.relative(root, destination).split(path.sep)) {
    current = path.join(current, part);
    await mkdir(current, { recursive: true });
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Artifact directories must not be symlinks.');
  }
  let file = artifactOutputJoin(destination, name);
  if (!path.extname(name) && namingVersion(path.join(destination, 'probe.md')) !== 0) {
    try { await lstat(file); } catch (error) { if (error.code !== 'ENOENT') throw error; file = path.join(destination, prefixed(name)); }
  }
  try {
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Artifact output must be a regular file, not a symlink.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const relative = path.relative(root, file);
  await within(root, relative, { existing: false });
  return { file, relative, name: path.basename(file), naming: namingVersion(file) === 0 ? 'legacy' : 'miw', gitProtection };
}
cli(import.meta.url, async argv => {
  const o = args(argv, ['--root', '--directory', '--name']);
  if (o.command !== 'resolve' || !o.root || !o.name) throw new Error('Usage: artifact-output.mjs resolve --root PROJECT --directory make-it-work/TICKET --name TICKET-plan.md');
  return resolveArtifactOutput(o);
});
