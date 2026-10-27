import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const fail = (message) => { throw new Error(message); };
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim() || /[\x00-\x1f]/.test(value)) fail(`${name} must be a nonempty single line.`);
  return value;
}
export function integer(value, name, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) fail(`${name} must be an integer >= ${min}.`);
  return value;
}
export async function atomicWrite(file, content) {
  try { if (!(await lstat(file)).isFile()) fail(`Not a regular file: ${file}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temp, content, { flag: 'wx' }); await rename(temp, file); }
  finally { await unlink(temp).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
}
export async function withLock(file, run) {
  const lock = `${file}.lock`;
  const handle = await open(lock, 'wx').catch((error) => {
    if (error.code === 'EEXIST') fail(`Checkpoint is locked: ${lock}. Reconcile an interrupted writer before retrying.`);
    throw error;
  });
  try { await handle.writeFile(String(process.pid)); return await run(); }
  finally { await handle.close(); await unlink(lock); }
}
export async function within(root, file, { existing = true } = {}) {
  const base = await realpath(root);
  const resolved = path.resolve(base, file);
  if (!resolved.startsWith(`${base}${path.sep}`)) fail(`Path escapes root: ${file}`);
  const actual = existing ? await realpath(resolved) : path.join(await realpath(path.dirname(resolved)), path.basename(resolved));
  if (!actual.startsWith(`${base}${path.sep}`)) fail(`Symlink escapes root: ${file}`);
  if (existing && !(await lstat(resolved)).isFile()) fail(`Not a regular file: ${file}`);
  return resolved;
}
export function section(markdown, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...markdown.matchAll(new RegExp(`^## ${escaped}\\s*$`, 'gm'))];
  if (matches.length > 1) fail(`Duplicate section: ${title}`);
  if (!matches.length) return null;
  const start = matches[0].index + matches[0][0].length;
  const end = markdown.slice(start).search(/^## /m);
  return markdown.slice(start, end < 0 ? undefined : start + end).trim();
}
export function table(markdown, headers) {
  const rows = markdown.split(/\r?\n/).filter((line) => line.trim().startsWith('|'))
    .map((line) => line.trim().split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim().replaceAll('\\|', '|')));
  if (!rows.length || rows[0].join('|') !== headers.join('|') || !rows[1]?.every((cell) => /^:?-+:?$/.test(cell))) fail(`Expected table: ${headers.join(' | ')}`);
  return rows.slice(2).map((cells) => {
    if (cells.length !== headers.length) fail('Malformed table row.');
    return Object.fromEntries(headers.map((header, i) => [header, cells[i]]));
  });
}
export const cell = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
export const slug = (value) => String(value).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
export async function writeSet(directory, prefix, files) {
  await mkdir(directory, { recursive: true });
  if (!(await lstat(directory)).isDirectory()) fail('Artifact directory must not be a symlink.');
  for (let n = 1; ; n += 1) {
    const name = n === 1 ? prefix : `${prefix}-${n}`;
    const bodies = files(name);
    const reserved = [];
    try {
      for (const [relative, body] of Object.entries(bodies)) {
        if (path.basename(relative) !== relative) fail('Artifact filenames must be basenames.');
        const file = path.join(directory, relative);
        const handle = await open(file, 'wx');
        reserved.push(file);
        try { await handle.writeFile(body); } finally { await handle.close(); }
      }
      return { prefix: name, files: reserved };
    } catch (error) {
      for (const file of reserved) await rm(file);
      if (error.code !== 'EEXIST') throw error;
    }
  }
}
export function args(argv, allowed) {
  const command = argv.shift();
  const options = {};
  while (argv.length) {
    const key = argv.shift();
    if (!allowed.includes(key) || !argv.length || Object.hasOwn(options, key.slice(2))) fail(`Invalid or duplicate option: ${key}`);
    options[key.slice(2)] = argv.shift();
  }
  return { command, ...options };
}
export function cli(meta, main) {
  if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(meta)) {
    Promise.resolve().then(() => main(process.argv.slice(2))).then((result) => {
      if (result !== undefined) process.stdout.write(`${typeof result === 'string' ? result : JSON.stringify(result)}\n`);
    }).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
  }
}
export async function jsonInput(file) {
  if (!file) fail('--input is required.');
  return JSON.parse(await readFile(file, 'utf8'));
}
