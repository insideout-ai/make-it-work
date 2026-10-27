import assert from 'node:assert/strict';
import test from 'node:test';
import { caseTools, pluginEvalArgs } from './run-suite-args.mjs';

test('scripted skills get only their declared helper tools while unrelated cases retain their own tools', () => {
  const suites = { requiredToolsBySkill: { 'slice-the-epic': ['Read', 'Bash'] }, extraTools: { example: ['Write'] } };
  assert.deepEqual(caseTools({ skill: 'slice-the-epic', name: 'example', tools: ['Write'], suites }), ['Write', 'Read', 'Bash']);
  assert.deepEqual(caseTools({ skill: 'other', name: 'other-case', tools: [], suites }), []);
});

test('omits --allow-tools when a case has no allowed tools', () => {
  const args = pluginEvalArgs({ name: 'negative-control', caseReportDir: '/tmp/report',
    remaining: 2, tools: [], scaffold: false });
  assert.equal(args.includes('--allow-tools'), false);
  assert.deepEqual(args.slice(-2), ['--max-cost-usd', '2.00']);
});

test('leaves the case model to plugin eval when none is given', () => {
  const args = pluginEvalArgs({ name: 'deliver-no-package', caseReportDir: '/tmp/report',
    remaining: 2, tools: [], scaffold: false });
  assert.equal(args.includes('--model'), false);
});

test('passes an explicit case model through', () => {
  const args = pluginEvalArgs({ name: 'deliver-no-package', caseReportDir: '/tmp/report',
    remaining: 2, tools: [], scaffold: false, model: 'claude-sonnet-5-5' });
  assert.equal(args[args.indexOf('--model') + 1], 'claude-sonnet-5-5');
});

test('passes an explicit judge model through', () => {
  const args = pluginEvalArgs({ name: 'find-the-repos-happy-path', caseReportDir: '/tmp/report',
    remaining: 2, tools: [], scaffold: false, judgeModel: 'claude-sonnet-5-5' });
  assert.equal(args[args.indexOf('--judge-model') + 1], 'claude-sonnet-5-5');
});

test('passes allowed tools and scaffold for a Bash-enabled case', () => {
  const args = pluginEvalArgs({ name: 'implement-autopilot-full', caseReportDir: '/tmp/report',
    remaining: 5, tools: ['Read', 'Bash'], scaffold: true });
  assert.deepEqual(args.slice(-4), ['--allow-tools', 'Read', 'Bash', '--scaffold']);
});
