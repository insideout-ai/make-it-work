#!/usr/bin/env node
import { lstat, mkdir, open, realpath } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
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

// Reserve the file before dispatch, so concurrent workers cannot choose the
// same evidence destination. The caller passes this exact path to its worker.
export async function allocateArtifactOutput(options) {
  const { name } = options;
  if (typeof name !== 'string' || name !== path.basename(name) || !name || ['.', '..'].includes(name)) throw new Error('Artifact name must be a plain filename.');
  const extension = path.extname(name);
  const stem = name.slice(0, name.length - extension.length);
  for (;;) {
    const output = await resolveArtifactOutput({ ...options, name: `${stem}-${randomUUID()}${extension}` });
    let handle;
    try { handle = await open(output.file, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') continue; throw error; }
    await handle.close();
    return { ...output, reserved: true };
  }
}

// Resolution only, not authorization: the controller still validates selected
// repos and context edits. Do not reinterpret a source path under artifact root.
export async function resolveArtifactInputs({ root, plan, 'source-root': sourceRoot, context }) {
  root = await realpath(root);
  const output = { artifact_root: root };
  if (plan) {
    output.plan = await within(root, plan);
    if (!output.plan.startsWith(path.join(root, 'make-it-work') + path.sep)) throw new Error('Plan must be under make-it-work.');
  }
  if (Boolean(sourceRoot) !== Boolean(context)) throw new Error('--source-root and --context must be supplied together.');
  if (sourceRoot) {
    output.source_root = await realpath(sourceRoot);
    const resolved = await within(output.source_root, context);
    output.context_updated = [await realpath(resolved)];
  }
  if (!plan && !context) throw new Error('Supply --plan or --source-root with --context.');
  return output;
}
cli(import.meta.url, async argv => {
  const o = args(argv, ['--root', '--directory', '--name', '--plan', '--source-root', '--context']);
  if (!o.root || !['resolve', 'allocate', 'inputs'].includes(o.command)) throw new Error('Usage: artifact-output.mjs resolve|allocate --root PROJECT [--directory make-it-work/TICKET] --name NAME; inputs --root ARTIFACT_ROOT [--plan PLAN] [--source-root SOURCE --context FILE]');
  const allowed = o.command === 'inputs' ? ['command', 'root', 'plan', 'source-root', 'context'] : ['command', 'root', 'directory', 'name'];
  if (Object.keys(o).some(key => !allowed.includes(key))) throw new Error('Option does not apply to this command.');
  if (o.command === 'inputs') return resolveArtifactInputs(o);
  return o.command === 'allocate' ? allocateArtifactOutput(o) : resolveArtifactOutput(o);
});
