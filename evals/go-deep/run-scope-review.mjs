import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkScopeReview } from './check-scope-review.mjs';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reportDir = await mkdtemp(path.join(os.tmpdir(), 'go-deep-review-report-'));
console.log(`Reports: ${reportDir}`);
const results = await Promise.allSettled([
  { name: 'atm', domains: 2, useCases: 4 },
  { name: 'large', domains: 8, useCases: 24 },
].map(async test => {
  const fixture = await exec('python3', [path.join(root, 'evals/go-deep/scope-review-fixture.py'), test.name]);
  const cwd = fixture.stdout.trim();
  const { stdout, stderr } = await exec('claude', ['-p', '/make-it-work:go-deep',
    '--plugin-dir', root, '--strict-mcp-config', '--tools', 'Read,Glob,Grep,AskUserQuestion',
    '--allowedTools', 'Read,Glob,Grep', '--max-turns', '25', '--max-budget-usd', '1.50',
    '--output-format', 'stream-json', '--verbose'], { cwd, timeout: 300_000, maxBuffer: 16 * 1024 * 1024 });
  await writeFile(path.join(reportDir, `${test.name}.jsonl`), stdout);
  await writeFile(path.join(reportDir, `${test.name}.stderr.txt`), stderr);
  const events = stdout.trim().split('\n').map(JSON.parse);
  const final = events.findLast(e => e.type === 'result');
  if (!final || final.is_error) throw new Error(`${test.name}: ${final?.result ?? 'missing result'}`);
  const result = checkScopeReview(events, test);
  console.log(`${test.name}: PASS ${JSON.stringify(result)}`);
  return { name: test.name, fixture: cwd, ...result };
}));
await writeFile(path.join(reportDir, 'results.json'), JSON.stringify(results.map(r =>
  r.status === 'fulfilled' ? r.value : { error: String(r.reason) }), null, 2));
for (const result of results) if (result.status === 'rejected') {
  console.error(result.reason);
  process.exitCode = 1;
}
