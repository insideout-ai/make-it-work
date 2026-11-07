// Synthetic prior refinement sessions; no live Slack or tracker is involved.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const variant = process.argv[2];
if (!['mixed-sources', 'pm-followup', 'stale-recommendation'].includes(variant)) throw new Error('Unknown decision-context fixture.');
const root = process.cwd();
const plugin = path.resolve(import.meta.dirname, '../..');
if (!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(root) || root === plugin || root.startsWith(plugin + path.sep)) throw new Error('Fixture requires a disposable temporary directory.');
try { await lstat('.git'); throw new Error('Fixture refuses an existing repository.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

const protectedFiles = {};
const put = async (file, content, protect = true) => {
  await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content);
  if (protect) protectedFiles[file] = createHash('sha256').update(content).digest('hex');
};
await put('.gitignore', 'make-it-work/\n');
await put('CLAUDE.md', '# Order exports\nCommonJS; local-only fixture. src/orders/export.js is current behavior. docs/provider-contract.md is the current upstream contract snapshot. No external service, credentials, PM approval rule or go-deep skills are configured.\n');
await put('src/orders/export.js', `const EXPORT_ROW_LIMIT = 100;
function exportOrders(orders) { return orders.slice(0, EXPORT_ROW_LIMIT); }
// Current upstream endpoint ignores unrecognized pagination arguments.
function fetchExportPage(orders, options = {}) { return orders.slice(0, EXPORT_ROW_LIMIT); }
module.exports = { EXPORT_ROW_LIMIT, exportOrders, fetchExportPage };
`);
await put('docs/provider-contract.md', `# Current synthetic export service contract
Each request returns at most the first 100 orders. There is no cursor, offset,
page number, range filter or alternate endpoint for accessing subsequent rows.
Repeated requests return the same first 100 rows. Upstream API changes are out
of scope for this ticket. This contract is the latest locally verified snapshot.
`);
await put('docs/prior-session.md', variant === 'stale-recommendation'
  ? '# Previous session\nRecommended Q1 automatic pagination based on an older claim that the upstream endpoint supported cursors. That recommendation was shown to the user before docs/provider-contract.md was obtained. Q2 recommended CSV-only. No later recommendation or substituted option has been shown or accepted.\n'
  : '# Previous session\nRecorded answer sources are preserved in the questions file. The session did not establish the current user\'s job title or require separate PM approval.\n');

const q = (id, question, choices, selected = -1, notes = '') => `### Q${id} — Missing acceptance criteria

**Question:** ${question}
**Why it matters:** Defines user-visible export behavior.

${choices.map((choice, index) => `- [${index === selected ? 'x' : ' '}] ${choice}`).join('\n')}
- [ ] Skip — decide later (TBD)

Notes (optional): ${notes}

`;
let questions, sources = '', slack = '';
if (variant === 'mixed-sources') {
  sources = `### Recorded answer provenance

- Q1: user via live chat, selected "Truncate to the first 100 and warn". The user's job title was not recorded.
- Q2: PM Taylor via Slack, selected "CSV-only for now". This answer was captured and confirmed in the prior session, reply reference D_SYNTHETIC/1793966400.002. This is recorded provenance, not a live Slack lookup in this run.
- Q3: no answer was supplied.
- Q4: a checkbox was filled in the file, with no author or role recorded.

`;
  questions = q(1, 'What should happen with more than 100 orders?', ['Block export above 100 (Recommended)', 'Truncate to the first 100 and warn'], 1)
    + q(2, 'Which file format should be offered?', ['CSV-only for now (Recommended)', 'CSV and XLSX'], 0)
    + q(3, 'Should the download show the exported row count?', ['Show the exported row count (Recommended)', 'No count label'])
    + q(4, 'Who may export their orders?', ['Account owners only (Recommended)', 'All account members'], 0);
} else if (variant === 'pm-followup') {
  sources = `### Recorded answer provenance

The user explicitly chose to resolve the outstanding questions live. Q1 and Q2 below were answered by the user via live chat. No role, delegated PM authority or requirement to obtain separate PM approval was asserted. The original PM thread has not been notified of these local resolutions.

`;
  slack = `### Slack

- Product Manager: Taylor PM (U_SYNTHETIC_PM)
- Direct message: D_SYNTHETIC
- Delivery mode: send
- Delivery status: sent
- Message timestamp: 1793966400.001
- Prepared at: 2026-11-06T12:00:00Z
- First line: close-the-gaps — DEC-600: Export orders
- Last verified thread state: no PM replies as of 2026-11-06T12:10:00Z; not checked since
- Resolution follow-up: not sent

#### Message

close-the-gaps — DEC-600: Export orders
Please answer Q1 export overflow and Q2 file format.

`;
  questions = q(1, 'What should happen with more than 100 orders?', ['Block export above 100 (Recommended)', 'Truncate to the first 100 and warn'], 1)
    + q(2, 'Which file format should be offered?', ['CSV-only for now (Recommended)', 'CSV and XLSX'], 0);
} else {
  questions = q(1, 'What should happen with more than 100 orders?', ['Automatically paginate to export every order (Recommended)', 'Truncate to the first 100 and warn'], -1, 'The recommendation was shown in the previous session using an older cursor-support claim; see docs/prior-session.md.')
    + q(2, 'Which file format should be offered?', ['CSV-only for now (Recommended)', 'CSV and XLSX']);
}
const prefix = 'make-it-work/DEC-600/DEC-600';
await put(`${prefix}-questions.md`, `# Offline Questions — DEC-600

> **Status:** Awaiting Answers

## Session Context

### Source

Pasted ticket, exported in a previous synthetic session. No tracker destination.

### Original Ticket

**Ticket:** DEC-600 — Export orders
**Description:** Account owners should export their orders to a CSV download.
**Acceptance Criteria:** An account owner can export orders. Upstream API changes are out of scope.

### Skills Loaded

- (none)

### Code Findings

- Q1 — src/orders/export.js: earlier session observed a 100-row limit; the cursor-support premise must be checked against current code and docs/provider-contract.md.
- Q2 — src/orders/export.js: format choice does not exist yet.
- Q3 — src/orders/export.js: there is no exported count label today.
- Q4 — account-owner export access is the original ticket actor; the current export helper does not implement access control itself.

${sources}${slack}## Questions

${questions}`, false);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' }).trim();
git('init', '-q', '-b', 'main'); git('add', '-A');
git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Synthetic export contracts and prior-session evidence');
git('switch', '-qc', 'DEC-600-export');
await writeFile(`${prefix}-decision-baseline.json`, JSON.stringify({ variant, head: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), protectedFiles }, null, 2) + '\n');
