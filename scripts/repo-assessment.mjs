#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access, lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, cli, fail, jsonInput } from './lib/artifacts.mjs';

async function exists(file) {
  try { return await lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export async function repositoryInventory(root) {
  root = await realpath(root);
  const candidates = await exists(path.join(root, '.git')) ? [root] : (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => path.join(root, entry.name));
  const repos = [];
  for (const directory of candidates) {
    const info = await exists(path.join(directory, '.git'));
    if (!info || !info.isDirectory() && !info.isFile()) continue;
    try {
      const top = execFileSync('git', ['-C', directory, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      if (await realpath(top) === await realpath(directory)) repos.push({ id: path.basename(directory), root: directory, git_kind: info.isFile() ? 'file' : 'directory' });
    } catch (error) { repos.push({ id: path.basename(directory), root: directory, unavailable: error.message }); }
  }
  return repos.sort((a, b) => a.id.localeCompare(b.id));
}
export async function ownerEvidence(root) {
  const evidence = [];
  for (const file of ['catalog-info.yaml', '.github/CODEOWNERS', 'CODEOWNERS']) {
    if (!await exists(path.join(root, file))) continue;
    const content = await readFile(path.join(root, file), 'utf8');
    const lines = content.split(/\r?\n/);
    if (file.endsWith('.yaml')) {
      let inSpec = false;
      for (let i = 0; i < lines.length; i += 1) {
        if (/^spec:\s*$/.test(lines[i])) { inSpec = true; continue; }
        if (/^\S/.test(lines[i])) inSpec = false;
        const match = inSpec && lines[i].match(/^\s+(owner|system):\s*([A-Za-z0-9_./:@-]+|'[^']*'|"[^"]*")\s*(?:#.*)?$/);
        if (match) evidence.push({ file, line: i + 1, kind: match[1], value: match[2].replace(/^['"]|['"]$/g, ''), raw: lines[i] });
      }
      if (!evidence.some((entry) => entry.file === file)) evidence.push({ file, line: 1, kind: 'unparsed-catalog', value: null, raw: content.slice(0, 4000) });
    } else for (let i = 0; i < lines.length; i += 1) {
      const row = lines[i].trim(); if (!row || row.startsWith('#')) continue;
      const parts = row.split(/\s+#/)[0].split(/\s+/);
      evidence.push({ file, line: i + 1, kind: 'review-rule', pattern: parts[0], owners: parts.slice(1).filter((value) => !value.startsWith('#')), raw: lines[i] });
    }
  }
  return evidence;
}
export async function searchExecutable() {
  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!path.isAbsolute(directory)) continue;
    const file = path.join(directory, 'rg');
    try { await access(file, constants.X_OK); return await realpath(file); } catch { /* try the next PATH entry */ }
  }
  return null;
}
export async function boundedSearch(root, terms, { binary, maxFiles = 20, maxLines = 60 } = {}) {
  if (!Array.isArray(terms) || !terms.length || terms.length > 8 || terms.some((term) => typeof term !== 'string' || !term || /[\0\r\n]/.test(term))) fail('Search needs 1–8 explicit single-line terms.');
  if (!Number.isSafeInteger(maxFiles) || maxFiles < 1 || maxFiles > 20 || !Number.isSafeInteger(maxLines) || maxLines < 1 || maxLines > 60) fail('Search budgets exceed the documented bounds.');
  const executable = binary ?? await searchExecutable();
  if (!executable) return { terms, matches: [], files: 0, complete: false, limitation: 'No verified rg executable available.' };
  if (!path.isAbsolute(executable)) fail('Search executable must be an absolute path.');
  return new Promise((resolve) => {
    const argv = ['--json', '--fixed-strings', '--hidden', '--glob', '!.git/**', '--glob', '!node_modules/**', '--glob', '!vendor/**', '--glob', '!make-it-work/**', '--glob', '!dist/**', '--glob', '!build/**', ...terms.flatMap((term) => ['-e', term]), '.'];
    const child = spawn(executable, argv, { cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    const matches = [], files = new Set(); let buffer = '', truncated = false, error = '';
    const timer = setTimeout(() => { truncated = true; error = 'Search timed out.'; child.kill('SIGKILL'); }, 10000);
    child.stderr.on('data', (chunk) => { error = (error + chunk.toString()).slice(-2000); });
    child.on('error', (cause) => { error = cause.message; });
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      if (buffer.length > 1024 * 1024) { truncated = true; child.kill('SIGKILL'); buffer = ''; return; }
      const lines = buffer.split('\n'); buffer = lines.pop();
      for (const line of lines) {
        if (truncated || !line) continue;
        let entry;
        try { entry = JSON.parse(line); } catch { error = 'Malformed search output.'; continue; }
        if (entry.type !== 'match') continue;
        const file = entry.data.path.text;
        if (!file) { error = 'Non-text path cannot be assessed.'; continue; }
        if (!files.has(file) && files.size >= maxFiles || matches.length >= maxLines) { truncated = true; child.kill('SIGKILL'); continue; }
        files.add(file); matches.push({ file: file.replace(/^\.\//, ''), line: entry.data.line_number, text: entry.data.lines.text?.trimEnd().slice(0, 400) ?? '[non-text match]' });
      }
    });
    child.on('close', (code) => { clearTimeout(timer); resolve({ terms, matches, files: files.size, complete: !truncated && !error && [0, 1].includes(code), limitation: truncated ? error || 'Search output budget reached.' : error || (code > 1 ? `Search exited ${code}` : null) }); });
  });
}
export async function collectAssessments(root, input) {
  root = await realpath(root);
  const inventory = await repositoryInventory(root);
  if (input.restrict_to !== undefined && (!Array.isArray(input.restrict_to) || !input.restrict_to.length || input.restrict_to.some((name) => typeof name !== 'string'))) fail('restrict_to must name selected repos.');
  const queue = inventory.filter((repo) => !input.restrict_to || input.restrict_to.includes(repo.id));
  for (const name of [...(input.named_repos ?? []), ...(input.restrict_to ?? [])]) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) fail('Named repo must be a basename.');
    if (!queue.some((repo) => repo.id === name)) queue.push({ id: name, root: path.join(root, name), unavailable: 'absent on disk' });
  }
  const visited = new Set(), assessments = [];
  for (const repo of queue) {
    if (visited.has(repo.id)) continue; visited.add(repo.id);
    if (repo.unavailable) { assessments.push({ ...repo, status: 'Not assessed / unavailable' }); continue; }
    const owners = await ownerEvidence(repo.root);
    const searches = [await boundedSearch(repo.root, input.terms)];
    if (input.followup_terms?.length && searches[0].complete) {
      const remainingLines = 60 - searches[0].matches.length;
      const remainingFiles = 20 - searches[0].files;
      if (remainingLines > 0 && remainingFiles > 0) searches.push(await boundedSearch(repo.root, input.followup_terms, { maxLines: remainingLines, maxFiles: remainingFiles }));
      else searches.push({ terms: input.followup_terms, matches: [], files: 0, complete: false, limitation: 'Follow-up not run; shared search budget exhausted.' });
    }
    assessments.push({ ...repo, owners, searches, complete: searches.every((search) => search.complete) });
  }
  return { root, assessments, visited: [...visited] };
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--input']);
  if (!o.root) fail('--root is required.');
  if (o.command === 'inventory') return repositoryInventory(o.root);
  if (o.command === 'collect') return collectAssessments(o.root, await jsonInput(o.input));
  fail('Usage: repo-assessment.mjs inventory|collect --root WORKSPACE [--input TERMS.json]');
});
