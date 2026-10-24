import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Read Claude's saved interactive transcript or --output-format stream-json.
// Deliberately exclude thinking blocks and tool arguments from review content.
export function checkScopeReview(events, { domains, useCases }) {
  let visible = '';
  let found = false;
  for (const event of events) {
    if (event.type !== 'assistant' || event.parent_tool_use_id || event.isSidechain) continue;
    for (const block of event.message?.content ?? []) {
      if (block.type === 'text') {
        visible += `\n${block.text}`;
        if (/approve and continue, request changes, or pause\?/i.test(block.text)) found = true;
      }
      if (block.type !== 'tool_use') continue;
      assert(!found, 'A tool was called after the written review instead of ending the turn');
      assert(!['Write', 'Edit', 'TaskCreate', 'TaskUpdate'].includes(block.name),
        'Documentation or foundation task work started before scope approval');
      if (block.name !== 'AskUserQuestion') continue;
      const questions = block.input.questions ?? [];
      const scope = questions.find(q => /domain and use-case list|checkpoint 1.*scope/is.test(q.question));
      assert(!scope, 'Scope approval must wait for a chat reply, not use the question tool');
    }
  }
  assert(found, 'No written review ending with the three choices was reached');
  // A corrected/revised review replaces the earlier inventory.
  const latest = visible.lastIndexOf('**Proposed domains**');
  if (latest >= 0) visible = visible.slice(latest);
  const rows = visible.split('\n').filter(line => /^\s*\|/.test(line))
    .map(line => line.trim().split('|').slice(1, -1).map(cell => cell.trim().replace(/`/g, '')));
  const domainRows = rows.filter(row => row.some(cell => /^domain-\d+-[a-z-]+$/.test(cell)));
  const ucRows = rows.filter(row => /^UC-\d+$/i.test(row[0]));
  assert.equal(domainRows.length, domains, 'Full domain table must appear in visible assistant text before the question');
  assert.equal(ucRows.length, useCases, 'Full use-case table must appear in visible assistant text before the question');
  assert(rows.some(row => row.join('|') === 'ID|Domain|Purpose|Skill name'), 'Domain header missing');
  assert(rows.some(row => row.join('|') === 'ID|Use Case|Actor|Trigger|Domains'), 'Use-case header missing');
  for (const row of domainRows) assert(row.length === 4 && row.every(Boolean), 'Incomplete domain row');
  const domainNames = new Set(domainRows.map(row => row[1]));
  for (const row of ucRows) {
    assert(row.length === 5 && row.every(Boolean), 'Incomplete use-case row');
    for (const domain of row[4].split(/,\s*/)) assert(domainNames.has(domain), `Unknown domain: ${domain}`);
  }
  assert.equal(new Set(domainRows.map(row => row[0])).size, domains, 'Duplicate domain IDs');
  assert.equal(new Set(ucRows.map(row => row[0])).size, useCases, 'Duplicate UC IDs');
  assert(!/\b(?:confirmed the scope|scope (?:is|has been) confirmed)\b/i.test(visible),
    'Scope was described as confirmed before approval');
  assert(/after approval|next.*approval/i.test(visible), 'Next action after approval missing');
  return { domains: domainRows.length, useCases: ucRows.length, checkpointReached: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, domains, useCases] = process.argv.slice(2);
  assert(file && Number(domains) > 0 && Number(useCases) > 0,
    'Usage: node evals/go-deep/check-scope-review.mjs TRANSCRIPT DOMAIN_COUNT UC_COUNT');
  const events = (await readFile(file, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  console.log(JSON.stringify(checkScopeReview(events, { domains: Number(domains), useCases: Number(useCases) })));
}
