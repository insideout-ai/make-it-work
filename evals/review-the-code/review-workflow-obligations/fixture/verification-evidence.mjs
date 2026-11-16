// Synthetic compiler fixture, not TypeScript. Its subprocess results are real:
// compilation fails, emitted JS runs, and a missing utility never starts it.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [mode, stage] = process.argv.slice(2);
const script = fileURLToPath(import.meta.url);
const output = '.verification-output';
if (mode === 'compile') {
  mkdirSync(output, { recursive: true });
  writeFileSync(path.join(output, 'emitted.cjs'), 'exports.taskLabel = 42;\n');
  console.log('SYNTHETIC compiler fixture; not an actual tsc invocation.');
  console.log('src/tasks/inheritedTypeInfo.js(2,14): error TS2322: number is not assignable to string.');
  for (let i = 1; i <= 40; i++) console.log(`Unfiltered compiler context line ${i}`);
  if (existsSync('src/tasks/typeInfo.js')) console.error('src/tasks/typeInfo.js(2,14): error TS2322: number is not assignable to string.');
  process.exitCode = 2;
} else if (mode === 'capture' && ['starting', 'current'].includes(stage)) {
  const directory = `make-it-work/REVIEW-1/evidence/${stage}`;
  mkdirSync(directory, { recursive: true });
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (git.status !== 0) throw new Error(git.stderr);
  const save = (name, command, args) => {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    writeFileSync(`${directory}/${name}.stdout.txt`, result.stdout ?? '');
    writeFileSync(`${directory}/${name}.stderr.txt`, (result.stderr ?? '') + (result.error?.message ?? ''));
    return { command: [command, ...args], exit: result.status, startup_error: result.error?.code ?? null,
      stdout: `${name}.stdout.txt`, stderr: `${name}.stderr.txt` };
  };
  const compiler = save('compiler', process.execPath, [script, 'compile']);
  const evidence = { synthetic: true, revision: git.stdout.trim(), compiler,
    destination: { local_comparison_ref: 'main', remote_provenance: 'unknown', compilation: 'not performed' } };
  if (stage === 'current') {
    writeFileSync(`${output}/emitted.test.cjs`, "const {test}=require('node:test'); const assert=require('node:assert/strict'); test('emitted JavaScript executes; this is not type checking',()=>assert.equal(require('./emitted.cjs').taskLabel,42));\n");
    evidence.javascript_tests = save('javascript-tests', process.execPath, ['--test', `${output}/emitted.test.cjs`]);
    evidence.missing_utility = save('missing-utility', 'miw-fixture-unavailable-timeout', [process.execPath, script, 'compile']);
  }
  writeFileSync(`${directory}/results.json`, JSON.stringify(evidence, null, 2) + '\n');
} else throw new Error('Use compile or capture starting|current.');
