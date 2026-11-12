import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicFiles = new Set(['README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'SUPPORT.md']);
const runtimeTypes = new Set(['.md', '.mjs', '.json', '.yaml', '.yml', '.txt', '.html', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico']);
export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 64 * 1024 * 1024 });
const fail = (message) => { throw new Error(message); };

export function included(file) {
  if (file.endsWith('.test.mjs')) return false;
  return file === '.claude-plugin/plugin.json' || publicFiles.has(file) ||
    /^(skills|commands|docs)\//.test(file) || (file.startsWith('scripts/') && file !== 'scripts/install-pre-push-hook.sh');
}

function localTarget(file, target) {
  const clean = target.split('#')[0].split('?')[0];
  if (!clean || /^(?:[a-z]+:|\/|\$)/i.test(clean) || /[<>*{}]/.test(clean)) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURI(clean)));
}

function references(files, all, sourceSha, repoUrl) {
  for (const [file, entry] of files) {
    if (file.endsWith('.mjs')) {
      const source = entry.bytes.toString('utf8');
      const targets = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
      for (const match of source.matchAll(/path\.resolve\(SCRIPT_DIR,\s*['"]([^'"]+)['"]\)/g)) targets.push(match[1]);
      for (const target of targets) {
        const resolved = localTarget(file, target);
        if (!resolved || !files.has(resolved)) fail(`Missing packaged dependency: ${file} -> ${target}`);
      }
    }
    if (!file.endsWith('.md')) continue;
    const runtime = /^(skills|commands)\//.test(file);
    let text = entry.bytes.toString('utf8');
    text = text.replace(/(!?\[[^\]\n]*\]\()(<[^>\n]+>|[^)\s]+)(\))/g, (whole, before, raw, after) => {
      const target = raw.replace(/^<|>$/g, '');
      const resolved = localTarget(file, target);
      if (!resolved || !all.has(resolved) || files.has(resolved)) return whole;
      if (runtime) fail(`Runtime documentation depends on excluded file: ${file} -> ${target}`);
      return `${before}${repoUrl}/blob/${sourceSha}/${resolved}${target.includes('#') ? '#' + target.split('#')[1] : ''}${after}`;
    });
    if (!runtime) entry.bytes = Buffer.from(text);
  }
}

export function summarize(entries) {
  const directories = new Set();
  let textBytes = 0, imageBytes = 0, maxDepth = 0;
  const largeFiles = [];
  for (const entry of entries) {
    const pieces = entry.path.split('/');
    maxDepth = Math.max(maxDepth, pieces.length - 1);
    for (let n = 1; n < pieces.length; n++) directories.add(pieces.slice(0, n).join('/'));
    if (/\.(png|jpe?g|gif|webp|ico)$/i.test(entry.path)) imageBytes += entry.size;
    else { textBytes += entry.size; if (entry.size > 256 * 1024) largeFiles.push(entry.path); }
  }
  if (entries.length + directories.size >= 2000 || maxDepth > 16 || textBytes > 12_000_000 || imageBytes > 64_000_000 || entries.some((e) => e.size >= 5 * 1024 * 1024)) fail('Package exceeds directory limits.');
  return { files: entries.length, directories: directories.size, entries: entries.length + directories.size, maxDepth, textBytes, imageBytes, largeFiles };
}

export async function buildPackage({ repo, source = 'HEAD', output, report }) {
  repo = path.resolve(repo); output = path.resolve(output); report = path.resolve(report);
  if (output === repo || output.startsWith(repo + path.sep) || report === repo || report.startsWith(repo + path.sep)) fail('Output and report must stay outside the source checkout.');
  if (report === output || report.startsWith(output + path.sep)) fail('Report must be outside the package.');
  const sourceSha = git(repo, 'rev-parse', '--verify', `${source}^{commit}`).toString().trim();
  if (!/^[a-f0-9]{40}$/.test(sourceSha)) fail('Invalid source commit.');
  try {
    const info = await lstat(output);
    if (!info.isDirectory() || info.isSymbolicLink() || (await readdir(output)).length) fail('Output must be a new or empty directory.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const tree = git(repo, 'ls-tree', '-rz', sourceSha).toString().split('\0').filter(Boolean).map((line) => {
    const [header, file] = line.split('\t'); const [mode, type, object] = header.split(' ');
    return { path: file, mode, type, object };
  });
  const all = new Set(tree.map((e) => e.path)), files = new Map();
  for (const entry of tree.filter((e) => included(e.path))) {
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) fail(`Unsupported entry: ${entry.path}`);
    if (!publicFiles.has(entry.path) && !runtimeTypes.has(path.extname(entry.path))) fail(`New file type needs a packaging rule: ${entry.path}`);
    files.set(entry.path, { ...entry, bytes: git(repo, 'cat-file', 'blob', entry.object) });
  }
  for (const required of ['.claude-plugin/plugin.json', 'README.md', 'LICENSE']) if (!files.has(required)) fail(`Missing required file: ${required}`);
  const manifest = JSON.parse(files.get('.claude-plugin/plugin.json').bytes);
  const repoUrl = 'https://github.com/insideout-ai/make-it-work';
  references(files, all, sourceSha, repoUrl);
  const readme = files.get('README.md');
  readme.bytes = Buffer.concat([Buffer.from(`> Anthropic runtime distribution, generated from [source ${sourceSha}](${repoUrl}/tree/${sourceSha}). Development fixtures and tooling remain in the source repository.\n\n`), readme.bytes]);
  const entries = [...files.values()].map((e) => ({ path: e.path, mode: e.mode, size: e.bytes.length, sha256: hash(e.bytes) })).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const summary = summarize(entries);
  const skills = entries.filter((e) => /^skills\/[^/]+\/SKILL\.md$/.test(e.path)).map((e) => e.path.split('/')[1]);
  if (!skills.length) fail('Package has no skills.');
  const result = { schemaVersion: 1, sourceSha, version: manifest.version, name: manifest.name, packageDigest: hash(JSON.stringify(entries)), skills, summary, files: entries,
    warnings: ['Executable helpers and skill hooks are preserved; packaging does not establish directory policy approval.', ...(summary.files > 512 ? ['More than 512 files: directory reviewer hold expected.'] : []), ...summary.largeFiles.map((p) => `Text file exceeds 256 KiB: ${p}`)] };
  await mkdir(output, { recursive: true });
  for (const [file, entry] of files) {
    const destination = path.join(output, file); await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, entry.bytes); await chmod(destination, entry.mode === '100755' ? 0o755 : 0o644);
  }
  await mkdir(path.dirname(report), { recursive: true });
  await writeFile(report, JSON.stringify(result, null, 2) + '\n');
  return result;
}

export async function verifyPackage(output, report) {
  const actual = [];
  async function visit(relative = '') {
    for (const item of await readdir(path.join(output, relative), { withFileTypes: true })) {
      const file = path.posix.join(relative, item.name), absolute = path.join(output, file);
      if (item.isDirectory()) await visit(file);
      else if (item.isFile()) {
        const info = await lstat(absolute), bytes = await readFile(absolute);
        actual.push({ path: file, mode: info.mode & 0o111 ? '100755' : '100644', size: bytes.length, sha256: hash(bytes) });
      } else fail(`Unsupported installed entry: ${file}`);
    }
  }
  await visit(); actual.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (JSON.stringify(actual) !== JSON.stringify(report.files) || hash(JSON.stringify(actual)) !== report.packageDigest) fail('Package contents differ from the verified report.');
  summarize(actual);
  return actual;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...argv] = process.argv.slice(2); const options = {};
  for (let i = 0; i < argv.length; i += 2) { if (!argv[i].startsWith('--') || !argv[i + 1]) fail('Expected --option value pairs.'); options[argv[i].slice(2)] = argv[i + 1]; }
  try {
    if (command === 'build') console.log(JSON.stringify(await buildPackage({ repo: options.repo || '.', source: options.source || 'HEAD', output: options.output, report: options.report })));
    else if (command === 'verify') { await verifyPackage(options.output, JSON.parse(await readFile(options.report, 'utf8'))); console.log('Package integrity verified.'); }
    else fail('Usage: package.mjs build --source SHA --output DIR --report FILE | verify --output DIR --report FILE');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
