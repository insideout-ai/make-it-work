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
