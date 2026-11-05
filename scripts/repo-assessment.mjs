#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access, lstat, mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cell, cli, fail, jsonInput, within } from './lib/artifacts.mjs';

async function exists(file) {
  try { return await lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function metadataRepos(root) {
  const file = path.join(root, 'CLAUDE.md');
  if (!await exists(file)) return [];
  const names = [];
  let column = -1;
  for (const [index, line] of (await readFile(file, 'utf8')).split(/\r?\n/).entries()) {
    if (!line.trim().startsWith('|')) { column = -1; continue; }
    const cells = line.trim().split('|').slice(1, -1).map((value) => value.trim().replaceAll('`', ''));
    const header = cells.findIndex((value) => /^(repo|repository)$/i.test(value));
    if (header >= 0) { column = header; continue; }
    const name = cells[column];
    if (column >= 0 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name ?? '') && !/^-+$/.test(name)) {
      names.push({ id: name, metadata: { file: 'CLAUDE.md', line: index + 1 } });
    }
  }
  return names;
}
export async function repositoryInventory(root, { namedRepos = [] } = {}) {
  root = await realpath(root);
  const single = await exists(path.join(root, '.git'));
  const candidates = single ? [root] : (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => path.join(root, entry.name));
  const repos = [];
  for (const directory of candidates) {
    const info = await exists(path.join(directory, '.git'));
    if (!info || !info.isDirectory() && !info.isFile()) continue;
    try {
      const top = execFileSync('git', ['-C', directory, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      if (await realpath(top) === await realpath(directory)) repos.push({ id: path.basename(directory), root: directory, git_kind: info.isFile() ? 'file' : 'directory' });
    } catch (error) { repos.push({ id: path.basename(directory), root: directory, unavailable: error.message }); }
  }
  for (const entry of [...(single ? [] : await metadataRepos(root)), ...namedRepos.map((id) => ({ id }))]) {
    if (typeof entry.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.id)) fail('Named repo must be a basename.');
    const found = repos.find((repo) => repo.id === entry.id);
    if (found) { if (entry.metadata) found.metadata = entry.metadata; continue; }
    const directory = path.join(root, entry.id);
    repos.push({ ...entry, root: directory, unavailable: await exists(directory) ? 'not a Git checkout' : 'absent on disk' });
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
  const inventory = await repositoryInventory(root, { namedRepos: input.named_repos ?? [] });
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

export function renderAssessmentTable(inventory, assessments = []) {
  if (!Array.isArray(assessments)) fail('Report assessments must be an array.');
  const byId = new Map();
  for (const entry of assessments) {
    if (byId.has(entry.id) || !inventory.some((repo) => repo.id === entry.id)) fail(`Duplicate or unknown assessment: ${entry.id}`);
    byId.set(entry.id, entry);
  }
  const statuses = ['Definite', 'Possible', 'No match', 'Excluded', 'Not assessed / unavailable'];
  const lines = ['| Repo | Tier / status | Owner / owner evidence | Docs assessed | Skills read | Code search and evidence | Flags / provenance |', '|---|---|---|---|---|---|---|'];
  for (const repo of inventory) {
    const entry = byId.get(repo.id);
    const unavailable = repo.unavailable || (!entry ? 'assessment not supplied' : null);
    const status = unavailable ? 'Not assessed / unavailable' : entry.status;
    if (!statuses.includes(status)) fail(`Invalid assessment status for ${repo.id}`);
    const provenance = repo.metadata ? `${repo.metadata.file}:${repo.metadata.line}` : '';
    const fields = unavailable
      ? [repo.id, status, 'Unknown', 'None', 'None', 'Not searched', [unavailable, provenance].filter(Boolean).join('; ')]
      : [repo.id, status, entry.owners ?? 'Unknown', entry.docs ?? 'None', entry.skills ?? 'None', entry.search ?? 'Not recorded', [entry.flags, provenance].filter(Boolean).join('; ') || 'None'];
    lines.push(`| ${fields.map(cell).join(' | ')} |`);
  }
  return lines.join('\n');
}

export async function writeAssessmentReport(root, input) {
  root = await realpath(root);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.ticket ?? '')) fail('Report needs a safe ticket identity.');
  if (typeof input.markdown !== 'string') fail('Report needs complete Markdown.');
  const headings = [...input.markdown.matchAll(/^## Assessment Evidence[ \t]*$/gm)];
  if (headings.length !== 1) fail('Report needs one Assessment Evidence section.');
  let inventory = await repositoryInventory(root, { namedRepos: [...(input.named_repos ?? []), ...(input.restrict_to ?? [])] });
  if (input.restrict_to !== undefined) {
    if (!Array.isArray(input.restrict_to) || !input.restrict_to.length) fail('restrict_to must name selected repos.');
    inventory = inventory.filter((repo) => input.restrict_to.includes(repo.id));
  }
  const table = renderAssessmentTable(inventory, input.assessments);
  const heading = headings[0];
  const start = heading.index + heading[0].length;
  const after = input.markdown.slice(start).search(/^## /m);
  const markdown = input.markdown.slice(0, start) + `\n\n${table}\n\n` + (after < 0 ? '' : input.markdown.slice(start + after));
  const relative = input.report_path ?? `make-it-work/${input.ticket}/${input.ticket}-repos.md`;
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..') || !relative.startsWith('make-it-work/')) fail('Report path must be inside make-it-work.');
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  const file = await within(root, relative, { existing: false });
  await atomicWrite(file, markdown);
  return { file, repositories: inventory.map((repo) => repo.id) };
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--input']);
  if (!o.root) fail('--root is required.');
  if (o.command === 'inventory') return repositoryInventory(o.root);
  if (o.command === 'collect') return collectAssessments(o.root, await jsonInput(o.input));
  if (o.command === 'report') return writeAssessmentReport(o.root, await jsonInput(o.input));
  fail('Usage: repo-assessment.mjs inventory|collect|report --root WORKSPACE [--input INPUT.json]');
});
