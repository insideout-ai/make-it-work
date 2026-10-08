import assert from 'node:assert/strict';
import test from 'node:test';
import { pluginEvalArgs } from './run-suite-args.mjs';

test('omits --allow-tools when a case has no allowed tools', () => {
  const args = pluginEvalArgs({ name: 'negative-control', caseReportDir: '/tmp/report',
    remaining: 2, tools: [], scaffold: false });
  assert.equal(args.includes('--allow-tools'), false);
  assert.deepEqual(args.slice(-2), ['--max-cost-usd', '2.00']);
});

test('passes allowed tools and scaffold for a Bash-enabled case', () => {
  const args = pluginEvalArgs({ name: 'implement-autopilot-full', caseReportDir: '/tmp/report',
    remaining: 5, tools: ['Read', 'Bash'], scaffold: true });
  assert.deepEqual(args.slice(-4), ['--allow-tools', 'Read', 'Bash', '--scaffold']);
});
