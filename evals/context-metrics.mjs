// Runtime observations only. Cumulative usage is not context occupancy.
const parent = event => !event.isSidechain && !event.parent_tool_use_id && !event.parentToolUseId;
const count = value => Number.isFinite(value) && value >= 0 ? value : null;
const inputKeys = ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'];

// Returned text only; never tokenizes characters or counts serialized requests.
export function contextPayloads(events) {
  const calls = new Map(), seen = new Set(), rows = [];
  const text = value => typeof value === 'string' ? value : Array.isArray(value)
    ? value.filter(block => block.type === 'text').map(block => block.text ?? '').join('\n') : '';
  for (const [index, event] of events.entries()) {
    if (!parent(event) || event.isSynthetic || !['user', 'assistant'].includes(event.type)) continue;
    const content = event.message?.content;
    if (event.type === 'user' && (!event.isMeta || event.promptSource === 'system')) {
      const body = text(content);
      if (/^(?:Another [^\n]+ session sent a message:\s*)?<agent-message\b/.test(body) || body.includes('<task-notification>') && /<result>[\s\S]*\S[\s\S]*<\/result>/.test(body)) {
        const key = event.uuid ?? `handback:${body}`;
        if (!seen.has(key)) { seen.add(key); rows.push({ category: 'stage-handback', line: index + 1, characters: body.length }); }
      }
    }
    if (event.isMeta || !Array.isArray(content)) continue;
    for (const block of content) {
      if (event.type === 'assistant' && block.type === 'tool_use') calls.set(block.id, block);
      if (event.type !== 'user' || block.type !== 'tool_result' || seen.has(block.tool_use_id)) continue;
      const call = calls.get(block.tool_use_id);
      if (!call) continue;
      seen.add(block.tool_use_id);
      const body = text(block.content), input = call.input ?? {};
      // Async launch receipts are not worker findings.
      if (call.name === 'Agent' || call.name === 'Task') {
        if (event.toolUseResult?.isAsync || /(?:Async agent launched|agent is working in the background)/i.test(body)) continue;
        rows.push({ category: 'stage-handback', line: index + 1, characters: body.length });
      } else if (['Read', 'Bash'].includes(call.name)) {
        const source = input.file_path ?? null;
        rows.push({ category: call.name === 'Bash' ? 'shell-result' : /(?:^|\/)skills\/.*\.md$/.test(source ?? '') ? 'instruction-read' : 'file-read',
          line: index + 1, characters: body.length, ...(source ? { source } : {}) });
      }
    }
  }
  return { unit: 'characters', totals: Object.fromEntries(['instruction-read', 'file-read', 'shell-result', 'stage-handback']
    .map(category => [category, rows.filter(row => row.category === category).reduce((sum, row) => sum + row.characters, 0)])),
    largest: rows.sort((a, b) => b.characters - a.characters).slice(0, 20),
    limitations: ['Observed returned text only; persisted external results may not have been loaded.',
      'Instruction classification uses skill Markdown paths; shell commands can also emit instructions.',
      'Characters are not tokens, context occupancy, cost or achievable savings.'] };
}

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
    payloads: contextPayloads(events),
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
