import assert from 'node:assert/strict';
import test from 'node:test';
import { contextMetrics } from './context-metrics.mjs';
const request = (id, input, extra = {}) => ({ type: 'assistant', request_id: id, message: { id, model: 'fixture', usage: { input_tokens: input, cache_creation_input_tokens: 20, cache_read_input_tokens: 30 } }, ...extra });
test('counts cached input, deduplicates streaming chunks and keeps children out of the parent peak', () => {
  const value = contextMetrics([request('a', 10), request('a', 10), request('b', 40), request('child', 1000, { parent_tool_use_id: 'launch' })]);
  assert.equal(value.parentRequestUsageRecords, 2);
  assert.equal(value.peakObservedParentInputTokensIncludingCache, 90);
  assert.equal(value.parentInputTokensAcrossObservedRequests, 150);
});
test('absence of usage is unknown rather than zero and child results cannot replace the parent result', () => {
  const value = contextMetrics([{ type: 'result', total_cost_usd: 2 }, { type: 'result', parent_tool_use_id: 'launch', total_cost_usd: 10 }]);
  assert.equal(value.peakObservedParentInputTokensIncludingCache, null);
  assert.equal(value.reportedExecutionCostUsd, 2);
  assert.equal(value.reportedExecutionDurationMs, null);
});
test('partial usage, diagnostic records and synthetic chunks cannot establish an observed peak', () => {
  const incomplete = request('partial', 1000); delete incomplete.message.usage.cache_read_input_tokens;
  const value = contextMetrics([incomplete, request('synthetic', 1000, { isSynthetic: true }), request('meta', 1000, { isMeta: true }), request('child', 1000, { isSidechain: true }), { ...request('diagnostic', 1000), type: 'api-request-blob' }]);
  assert.equal(value.parentRequestUsageRecords, 0);
  assert.equal(value.peakObservedParentInputTokensIncludingCache, null);
});

test('payload inventory separates instructions, shell output and real handbacks from launches and replays', () => {
  const call = (id, name, input = {}) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
  const result = (id, content, extra = {}) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content }] }, ...extra });
  const instruction = result('read', 'rules');
  const events = [call('read', 'Read', { file_path: '/plugin/skills/example/SKILL.md' }), instruction, instruction,
    { ...instruction, type: 'api-request-blob' },
    call('bash', 'Bash'), result('bash', 'logs'), call('agent', 'Agent'),
    result('agent', 'Async agent launched successfully.', { toolUseResult: { isAsync: true } }),
    { type: 'user', uuid: 'handback', isMeta: true, promptSource: 'system', message: { content: 'Another Claude session sent a message: <agent-message>Finding and blocker</agent-message>' } },
    { type: 'user', message: { content: '<task-notification><summary>started</summary></task-notification>' } },
    { type: 'user', isSidechain: true, message: { content: '<agent-message>child internal</agent-message>' } }];
  const payloads = contextMetrics(events).payloads;
  assert.deepEqual(payloads.totals, { 'instruction-read': 5, 'file-read': 0, 'shell-result': 4,
    'stage-handback': events[8].message.content.length });
  assert.equal(payloads.unit, 'characters');
  assert.equal(payloads.largest.length, 3);
});
