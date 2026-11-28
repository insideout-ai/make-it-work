import { modelKey } from './cost-pricing.mjs';

const count = n => Number.isSafeInteger(n) && n >= 0;
const content = event => event.message?.content;
const text = event => typeof content(event) === 'string' ? content(event) : '';
const blocks = event => Array.isArray(content(event)) ? content(event) : [];
const command = event => event.type === 'user' && !event.isSynthetic && !event.isMeta
  ? text(event).match(/^(?:<command-name>)?\/(?:make-it-work:)?(implement|[\w:-]+)(?:<\/command-name>|\s|$)/m)?.[1] : null;

export function estimateArchive({ files, manifest }, { runId, pricing, ticket = null }) {
  const gaps = new Set([
    'Snapshot ends at transcript collection; later feedback readback, finalization and delivery are excluded.',
    'Transcript token records do not certify complete output usage or unseen requests; this is a partial API-equivalent token estimate, excluding external service fees.',
    'Standard global on-demand rates are assumed unless supported usage metadata specifies otherwise.',
  ]);
  const parse = entry => {
    const data = files.get(entry.name);
    if (entry.status !== 'captured' || !data || !entry.name.endsWith('.jsonl')) { gaps.add('A transcript is unavailable or not JSONL.'); return []; }
    return data.toString('utf8').split('\n').flatMap(line => {
      if (!line.trim()) return [];
      try { return [JSON.parse(line)]; } catch { gaps.add('Malformed or incomplete transcript records were skipped.'); return []; }
    });
  };
  const mainEntry = manifest.entries.find(e => e.role === 'main');
  if (!mainEntry) throw new Error('Main transcript missing');
  const main = parse(mainEntry);
  const belongsToRun = event => {
    if (command(event) !== 'implement') return false;
    const args = text(event).match(/<command-args>([^<]*)<\/command-args>/)?.[1] ??
      text(event).match(/^\/(?:make-it-work:)?implement(?:\s+([^\n]*))?$/m)?.[1] ?? '';
    const positional = args.split(/\s+/).filter(s => s && !s.startsWith('--'));
    return !ticket || !positional.length || positional.includes(ticket);
  };
  const start = Date.parse(runId), end = Date.parse(manifest.capturedAt);
  if (!Number.isFinite(start) || end < start) throw new Error('Archive predates this run');
  let from = start;
  const priorCommand = main.findLast(e => Date.parse(e.timestamp) <= start && command(e));
  const invocation = priorCommand && belongsToRun(priorCommand) ? priorCommand : null;
  if (invocation && Number.isFinite(Date.parse(invocation.timestamp))) from = Date.parse(invocation.timestamp);
  else gaps.add('Invocation startup boundary unavailable; usage before the saved workflow start is excluded.');
  if (main.find(e => Date.parse(e.timestamp) > start)?.timestamp &&
      !main.some(e => Date.parse(e.timestamp) <= start)) gaps.add('Earlier session history is missing; resumed work may be excluded.');
  gaps.add('Only this archived session is available. Earlier resumed sessions and unmarked interleaved conversation cannot be fully reconciled.');

  const requests = new Map(), wanted = new Map(), visited = new Set();
  function scan(events, lower, parent = true) {
    let active = true;
    const calls = new Map();
    for (const event of events) {
      const at = Date.parse(event.timestamp);
      if (!Number.isFinite(at) || at < lower || at > end) continue;
      if (parent && command(event)) active = belongsToRun(event);
      if (!active || event.isMeta || event.isSynthetic) continue;
      if (parent && (event.isSidechain || event.parent_tool_use_id || event.parentToolUseId)) continue;
      if (event.type === 'assistant') {
        for (const block of blocks(event)) if (block.type === 'tool_use' && ['Agent', 'Task'].includes(block.name)) calls.set(block.id, at);
        const message = event.message;
        if (!message?.usage) { if (message?.id) gaps.add('Some assistant requests have no token usage.'); continue; }
        if (typeof message.id !== 'string' || !message.id) { gaps.add('Requests without a stable message ID were skipped.'); continue; }
        const candidate = { model: message.model, usage: message.usage };
        const previous = requests.get(message.id);
        // Multiple content blocks share one response ID. Keep the largest output
        // observation for streamed revisions; incompatible input records are unsafe.
        if (previous) {
          const a = { ...previous.usage, output_tokens: 0 }, b = { ...candidate.usage, output_tokens: 0 };
          if (previous.model !== candidate.model || JSON.stringify(a) !== JSON.stringify(b)) {
            previous.conflict = true; gaps.add('Conflicting duplicate usage records were excluded.');
          } else if (candidate.usage.output_tokens > previous.usage.output_tokens) previous.usage = candidate.usage;
        } else requests.set(message.id, candidate);
      }
      if (event.type === 'user' && blocks(event).some(b => b.type === 'tool_result' && !b.is_error && calls.has(b.tool_use_id))) {
        const id = event.toolUseResult?.agentId;
        if (typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id)) {
          const launched = Math.min(...blocks(event).filter(b => calls.has(b.tool_use_id)).map(b => calls.get(b.tool_use_id)));
          wanted.set(id, Math.min(wanted.get(id) ?? Infinity, launched));
        } else gaps.add('A child-agent result has no verifiable transcript identity.');
      }
    }
  }
  scan(main, from);
  while ([...wanted.keys()].some(id => !visited.has(id))) {
    for (const [id, launched] of wanted) {
      if (visited.has(id)) continue;
      visited.add(id);
      const entry = manifest.entries.find(e => e.role === 'agent' && e.agentId === id);
      if (!entry) { gaps.add('A referenced child-agent transcript is missing.'); continue; }
      scan(parse(entry).filter(e => !e.agentId || e.agentId === id), launched, false);
    }
  }
  const models = {}, skipped = [];
  for (const [id, request] of requests) {
    const { usage: u } = request, key = modelKey(request.model), rates = Object.hasOwn(pricing.models, key) ? pricing.models[key] : null;
    let reason;
    if (request.conflict) reason = 'conflicting usage';
    else if (!rates) reason = 'unknown model price';
    else if (!count(u.input_tokens) || !count(u.output_tokens) ||
        !count(u.cache_read_input_tokens ?? 0) || !count(u.cache_creation_input_tokens ?? 0)) reason = 'invalid token counts';
    else if (u.speed && u.speed !== 'standard' || u.service_tier && !['standard', 'default'].includes(u.service_tier)) reason = 'unsupported pricing modifier';
    else if (u.inference_geo && !['us', 'global'].includes(u.inference_geo)) reason = 'unsupported inference geography';
    const write = u.cache_creation_input_tokens ?? 0, read = u.cache_read_input_tokens ?? 0;
    let write5m = u.cache_creation?.ephemeral_5m_input_tokens ?? (u.cache_creation ? 0 : write), write1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    if (u.cache_creation && (!count(write5m) || !count(write1h) || write5m + write1h !== write)) reason = 'inconsistent cache counts';
    if (write && !u.cache_creation) gaps.add('Cache writes without TTL metadata are priced as 5-minute writes.');
    if (count(u.input_tokens) && u.input_tokens + read + write > 200000 && /claude-sonnet-4(?:-5)?$/.test(key)) reason = 'unsupported legacy long-context tier';
    if (reason) { skipped.push({ model: typeof request.model === 'string' ? request.model : 'unknown', reason }); gaps.add(`Some requests were excluded: ${reason}.`); continue; }
    const tokens = { input: u.input_tokens, output: u.output_tokens, write5m, write1h, read };
    const multiplier = u.inference_geo === 'us' ? 1.1 : 1;
    const usd = Object.entries(tokens).reduce((sum, [category, n]) => sum + n * rates[category] / 1e6, 0) * multiplier;
    const row = models[key] ??= { requests: 0, usd: 0, tokens: { input: 0, output: 0, write5m: 0, write1h: 0, read: 0 }, rates };
    row.requests++; row.usd += usd;
    for (const category of Object.keys(tokens)) row.tokens[category] += tokens[category];
  }
  const priced = Object.values(models).reduce((sum, m) => sum + m.requests, 0);
  return { status: priced ? 'partial' : 'unavailable', usd: priced ? Object.values(models).reduce((sum, m) => sum + m.usd, 0) : null,
    reason: priced ? null : 'No attributable requests with supported token usage and pricing.',
    capturedAt: manifest.capturedAt, pricing, models, pricedRequests: priced, skippedRequests: skipped.length,
    limitations: [...gaps], excludedModels: [...new Set(skipped.map(s => s.model))] };
}
