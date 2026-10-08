import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { gradeHeadlessCase, parseGrader, transcriptContext } from './grade-headless.mjs';
import { validateEvalTree } from './validate.mjs';

const transcript = [
  { type: 'assistant', message: { content: [
    { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } },
    { type: 'text', text: 'The suite passed.' },
  ] } },
  { type: 'result', result: 'Gate result: PASS', total_cost_usd: 0.1 },
].map((event) => JSON.stringify(event)).join('\n') + '\n';

test('parses headless grader frontmatter', () => {
  const grader = parseGrader(`---\ntype: regex\ntarget: { source: file, path: "report.md" }\npattern: "PASS\\\\s+now"\nmatch: not_contains\n---\n`, 'example.md');
  assert.deepEqual(grader.target, { source: 'file', path: 'report.md' });
  assert.equal(grader.pattern, 'PASS\\s+now');
  assert.equal(grader.match, 'not_contains');
});

test('grades local checks and semantic checks without a review status', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'miw-headless-grader-'));
  t.after(async () => { const { rm } = await import('node:fs/promises'); await rm(root, { recursive: true }); });
  const graderDir = path.join(root, 'graders');
  await mkdir(graderDir);
  await mkdir(path.join(root, '.claude'));
  await writeFile(path.join(root, '.claude', 'log.jsonl'), '{}\n');
  await writeFile(path.join(root, 'report.md'), 'The regression gate passed.\n');
  await writeFile(path.join(graderDir, 'exists.md'), '---\ntype: file_exists\npath: .claude/*.jsonl\n---\n');
  await writeFile(path.join(graderDir, 'pattern.md'), '---\ntype: regex\ntarget: { source: file, path: "report.md" }\npattern: "regression gate passed"\n---\n');
  await writeFile(path.join(graderDir, 'tool.md'), '---\ntype: tool_used\ntool: Bash\ninput_match: "npm test"\nmin: 1\n---\n');
  await writeFile(path.join(graderDir, 'semantic.md'), '---\ntype: llm\nfocus: last_message\n---\nRequire a passing gate.\n');
  const judge = async (prompt) => {
    assert.match(prompt, /Gate result: PASS/);
    return { stdout: JSON.stringify({ total_cost_usd: 0.02,
      structured_output: { verdict: 'PASS', reason: 'Gate is PASS' } }) };
  };
  const graded = await gradeHeadlessCase({ graderDir, transcript, fixtureDir: root,
    budgetUsd: 1, judge });
  assert.equal(graded.passed, true);
  assert.equal(graded.verdicts.length, 4);
  assert.equal(graded.judgeCostUsd, 0.02);
});

test('fails closed on an ungradable semantic check', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'miw-headless-grader-'));
  t.after(async () => { const { rm } = await import('node:fs/promises'); await rm(root, { recursive: true }); });
  const graderDir = path.join(root, 'graders');
  await mkdir(graderDir);
  await writeFile(path.join(graderDir, 'semantic.md'), '---\ntype: llm\nfocus: last_message\n---\nRequire a passing gate.\n');
  const graded = await gradeHeadlessCase({ graderDir, transcript, fixtureDir: root,
    budgetUsd: 1, judge: async () => ({ stdout: 'not json' }) });
  assert.equal(graded.passed, false);
  assert.match(graded.verdicts[0].detail, /Grader error/);
});

test('skips paid judges after a failed local check', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'miw-headless-grader-'));
  t.after(async () => { const { rm } = await import('node:fs/promises'); await rm(root, { recursive: true }); });
  const graderDir = path.join(root, 'graders');
  await mkdir(graderDir);
  await writeFile(path.join(graderDir, 'missing.md'), '---\ntype: file_exists\npath: absent.txt\n---\n');
  await writeFile(path.join(graderDir, 'semantic.md'), '---\ntype: llm\nfocus: last_message\n---\nRequire a passing gate.\n');
  const graded = await gradeHeadlessCase({ graderDir, transcript, fixtureDir: root,
    budgetUsd: 1, judge: async () => { throw new Error('judge should not run'); } });
  assert.equal(graded.passed, false);
  assert.deepEqual(graded.verdicts.map((item) => item.name), ['missing.md']);
});

test('requires a final result in headless transcripts', () => {
  assert.throws(() => transcriptContext('{"type":"assistant"}\n', '/tmp/fixture'),
    /No final result/);
});

test('parses every headless grader definition', async () => {
  const { cases, suites } = await validateEvalTree();
  for (const name of suites.headless) {
    const item = cases.find((entry) => entry.name === name);
    for (const filename of (await readdir(path.join(item.dir, 'graders'))).filter((file) => file.endsWith('.md'))) {
      const grader = parseGrader(await readFile(path.join(item.dir, 'graders', filename), 'utf8'), filename);
      assert.ok(['file_exists', 'regex', 'tool_used', 'llm'].includes(grader.type), `${name}/${filename}`);
      if (grader.type === 'llm') assert.ok(grader.focus, `${name}/${filename}: missing focus`);
    }
  }
});

test('plan tests field accepts required evidence in either order', async () => {
  const markdown = await readFile(path.join('evals', 'plan-the-work', 'with-tests',
    'graders', 'plan-tests-field-recorded.md'), 'utf8');
  const { pattern } = parseGrader(markdown, 'plan-tests-field-recorded.md');
  const expression = new RegExp(pattern);
  assert.match('**Tests:** src/tasks/createTask.test.js, npm test; red on whitespace and trim', expression);
  assert.match('**Tests:** src/tasks/createTask.test.js, npm test; whitespace and trim confirmed red', expression);
  assert.doesNotMatch('**Tests:** src/tasks/createTask.test.js, npm test; whitespace and trim', expression);
});

test('sparse epic turn-cap check accepts only a bounded summary', async () => {
  const markdown = await readFile(path.join('evals', 'shape-the-epic',
    'shape-the-epic-sparse-input-autopilot', 'graders', 'turn-cap-exercised.md'), 'utf8');
  const { pattern } = parseGrader(markdown, 'turn-cap-exercised.md');
  const expression = new RegExp(pattern);
  assert.match('Part A: 3 self-answered turn(s) used (cap 6); exit: early (no open threads remaining)', expression);
  assert.match('Part A: 6 self-answered turn(s) used (cap 6); exit: cap-reached (open threads: roles)', expression);
  assert.doesNotMatch('Part A: 7 self-answered turn(s) used (cap 6); exit: early (no open threads remaining)', expression);
});
