import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { zip } from './lib/zip.mjs';
import { readCostArchive } from './lib/cost-archive.mjs';
import { estimateArchive } from './lib/cost-estimate.mjs';
import { BUNDLED_PRICING, parsePricing, loadPricing } from './lib/cost-pricing.mjs';

const at = seconds => `2026-11-28T10:00:${String(seconds).padStart(2, '0')}Z`;
const assistant = (id, seconds, usage = {}, extra = {}) => ({ type: 'assistant', timestamp: at(seconds), message: {
  id, model: 'claude-sonnet-4-6', usage: { input_tokens: 1000, output_tokens: 100, ...usage }, ...extra,
} });
const user = (seconds, content, toolUseResult) => ({ type: 'user', timestamp: at(seconds), message: { content }, toolUseResult });
function archive(main, children = []) {
  const files = new Map([['miw-main-transcript.jsonl', Buffer.from(main.map(e => JSON.stringify(e)).join('\n'))]]);
  const entries = [{ name: 'miw-main-transcript.jsonl', role: 'main', status: 'captured' }];
  for (const [agentId, events] of children) {
    const name = `miw-agent-${agentId}-transcript.jsonl`;
    files.set(name, Buffer.from(events.map(e => JSON.stringify(e)).join('\n')));
    entries.push({ name, agentId, role: 'agent', status: 'captured' });
  }
  for (const entry of entries) { entry.bytes = files.get(entry.name).length; entry.sha256 = createHash('sha256').update(files.get(entry.name)).digest('hex'); }
  return { files, manifest: { version: 1, capturedAt: at(50), entries } };
}
const estimate = a => estimateArchive(a, { runId: at(5), pricing: BUNDLED_PRICING });

test('prices cached tokens independently and deduplicates streamed output and copied messages', () => {
  const usage = { cache_creation_input_tokens: 500, cache_read_input_tokens: 10000,
    cache_creation: { ephemeral_5m_input_tokens: 200, ephemeral_1h_input_tokens: 300 } };
  const result = estimate(archive([user(0, '/make-it-work:implement DEMO'), assistant('a', 2, { ...usage, output_tokens: 50 }), assistant('a', 3, usage)]));
  assert.equal(result.status, 'partial'); assert.equal(result.pricedRequests, 1);
  assert.ok(Math.abs(result.usd - 0.01005) < 1e-10);
  assert.equal(result.models['claude-sonnet-4-6'].tokens.output, 100);
});

test('filters outside-run commands, follows verified nested children, ignores unrelated archived agents', () => {
  const launch = (id, seconds, child) => [assistant(id, seconds, {}, { content: [{ type: 'tool_use', name: 'Agent', id: `call-${id}` }] }),
    user(seconds + 1, [{ type: 'tool_result', tool_use_id: `call-${id}` }], { agentId: child })];
  const result = estimate(archive([assistant('before', 0), user(1, '/make-it-work:implement DEMO'),
    ...launch('main', 6, 'child'), user(30, '/other-command'), assistant('unrelated', 31),
    user(40, '/make-it-work:implement DEMO'), assistant('resume', 41)], [
    ['child', [...launch('child', 10, 'nested'), assistant('main', 6)]],
    ['nested', [assistant('nested', 13, {}, { model: 'claude-haiku-4-5-20251001' })]],
    ['unrelated', [assistant('outsider', 15)]],
  ]));
  assert.equal(result.pricedRequests, 4); assert.equal(result.models['claude-haiku-4-5'].requests, 1);
  assert.ok(Math.abs(result.usd - 0.015) < 1e-10);
});

test('incomplete data, unsupported pricing and missing children are explicit gaps, never zero-cost success', () => {
  const a = archive([assistant('unknown', 10, {}, { model: 'unknown' }), assistant('bad', 11, { output_tokens: -1 }),
    assistant('fast', 12, { speed: 'fast' }), assistant('missing', 13, {}, { usage: undefined }),
    assistant('child', 14, {}, { content: [{ type: 'tool_use', id: 'c', name: 'Agent' }] }),
    user(15, [{ type: 'tool_result', tool_use_id: 'c' }], { agentId: 'absent' })]);
  const result = estimate(a);
  assert.equal(result.pricedRequests, 1); assert.equal(result.skippedRequests, 3);
  assert.match(result.limitations.join(' '), /missing|unavailable/);
  assert.equal(estimate(archive([assistant('unknown', 10, {}, { model: 'unknown' })])).usd, null);
  assert.equal(estimate(archive([])).status, 'unavailable');
});

test('runtime command markers include startup, other tickets are excluded, and session monetary totals are ignored', () => {
  const a = archive([user(1, '<command-message>make-it-work:implement</command-message>\n<command-name>/make-it-work:implement</command-name>\n<command-args>DEMO</command-args>'),
    assistant('startup', 2), { type: 'result', timestamp: at(6), total_cost_usd: 99999, usage: { input_tokens: 999999 } },
    user(10, '/make-it-work:implement OTHER'), assistant('other-ticket', 11),
    user(20, '/make-it-work:implement DEMO'), assistant('resume', 21)]);
  const result = estimateArchive(a, { runId: at(5), pricing: BUNDLED_PRICING, ticket: 'DEMO' });
  assert.equal(result.pricedRequests, 2); assert.ok(Math.abs(result.usd - 0.009) < 1e-10);
});

test('inference geography, conflicting usage, unknown TTL and legacy long-context tiers', () => {
  const result = estimate(archive([assistant('us', 10, { inference_geo: 'us' }),
    assistant('conflict', 11), assistant('conflict', 12, { input_tokens: 9999 }),
    assistant('ttl', 14, { cache_creation_input_tokens: 100 }),
    assistant('legacy', 15, { input_tokens: 300000 }, { model: 'claude-sonnet-4-5' })]));
  assert.equal(result.pricedRequests, 2);
  assert.ok(Math.abs(result.usd - (0.0045 * 1.1 + 0.004875)) < 1e-10);
  assert.match(result.limitations.join(' '), /5-minute/);
});

test('bounded archive reader validates captured bytes and manifest without filesystem extraction', () => {
  const a = archive([assistant('a', 10)]);
  const packed = zip([...a.files].map(([name, data]) => ({ name, data })).concat({ name: 'miw-manifest.json', data: JSON.stringify(a.manifest) }));
  assert.equal(estimate(readCostArchive(packed)).pricedRequests, 1);
  assert.throws(() => readCostArchive(packed.subarray(0, 40)));
  const badManifest = { ...a.manifest, entries: a.manifest.entries.map(e => ({ ...e, sha256: '0'.repeat(64) })) };
  assert.throws(() => readCostArchive(zip([...a.files].map(([name, data]) => ({ name, data })).concat({ name: 'miw-manifest.json', data: JSON.stringify(badManifest) }))), /checksum/);
});

const documentedTable = `## Model pricing
| Model | Base input tokens | 5m cache writes | 1h cache writes | Cache hits and refreshes | Output tokens |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Claude Sonnet 4.6 | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |
| Claude Opus 4.6 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |
## Batch processing
| Claude Sonnet 4.6 | $1.5 / MTok | $1.875 / MTok | $3 / MTok | $0.15 / MTok | $7.5 / MTok |`;
test('official pricing parser accepts the documented table only and fallback retains its provenance', async () => {
  const parsed = parsePricing(documentedTable);
  assert.equal(parsed.models['claude-sonnet-4-6'].input, 3);
  assert.throws(() => parsePricing(documentedTable.replace('$3.75', '$999')), /Inconsistent/);
  assert.throws(() => parsePricing(documentedTable.replace('## Model pricing', '## Different table')));
  const live = await loadPricing(async () => new Response(documentedTable));
  assert.equal(live.origin, 'fetched');
  const fallback = await loadPricing(async () => { throw new Error('offline'); });
  assert.equal(fallback.origin, 'bundled'); assert.equal(fallback.verifiedAt, '2026-11-28'); assert.ok(fallback.fallbackReason);
});
