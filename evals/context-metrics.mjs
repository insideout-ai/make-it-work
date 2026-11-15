// Runtime observations only. Cumulative usage is not context occupancy.
const parent = event => !event.isSidechain && !event.parent_tool_use_id && !event.parentToolUseId;
const count = value => Number.isFinite(value) && value >= 0 ? value : null;
const inputKeys = ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'];

export function contextMetrics(transcript) {
  const events = typeof transcript === 'string'
    ? transcript.split('\n').filter(line => line.trim()).map(line => JSON.parse(line)) : transcript;
  const requests = new Map();
  let compactions = 0;
  for (const event of events) {
    if (!parent(event) || event.isSynthetic || event.isMeta) continue;
    if (event.type === 'system' && event.subtype === 'compact_boundary') compactions++;
    if (event.type !== 'assistant' || !event.message?.usage) continue;
    const id = event.request_id ?? event.message.id;
    if (!id) continue; // Unidentified streaming chunks cannot establish request counts.
    const usage = event.message.usage;
    if (inputKeys.some(key => count(usage[key]) === null)) continue;
    const tokens = inputKeys.reduce((total, key) => total + usage[key], 0);
    const saved = requests.get(id);
    if (!saved || tokens > saved.inputTokens) requests.set(id, { inputTokens: tokens, model: event.message.model ?? null });
  }
  const result = events.findLast(event => event.type === 'result' && parent(event));
  return {
    version: 1,
    parentRequestUsageRecords: requests.size,
    peakObservedParentInputTokensIncludingCache: requests.size ? Math.max(...[...requests.values()].map(value => value.inputTokens)) : null,
    parentInputTokensAcrossObservedRequests: requests.size ? [...requests.values()].reduce((sum, value) => sum + value.inputTokens, 0) : null,
    observedCompactions: compactions,
    reportedExecutionCostUsd: count(result?.total_cost_usd),
    reportedExecutionDurationMs: count(result?.duration_ms),
    reportedUsageAllAgents: result?.usage ?? null,
    reportedModelUsage: result?.modelUsage ?? null,
    reportedSubagentStats: result?.subagent_stats ?? null,
    limitations: [
      'Peak input includes cached input, excludes generated output, and is not remaining context capacity.',
      'Across-request input is cumulative processing, not simultaneous context occupancy.',
      'Parent-only peaks exclude identified sidechains; missing or incomplete request usage remains unmeasured.',
      'Reported result usage and cost may include delegates and do not establish separate per-agent billing.',
    ],
  };
}
