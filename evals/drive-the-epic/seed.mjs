import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { initEpicRun, updateEpicRun } from '../../scripts/epic-workflow.mjs';
const kind = process.argv[2], root = process.cwd();
const unavailable = kind === 'jira-unavailable';
const result = await initEpicRun({ root, input: { title: 'Order exports', goal: 'Let customers reconcile purchases', autonomy: kind === 'review-gate' ? 'interactive' : 'autopilot', sources: [{ id: 'brief', reference: unavailable ? 'https://example.invalid/browse/APP-404' : 'Completed discovery interview', available: !unavailable, content: unavailable ? '' : 'Logged-in customers export only their own orders as CSV. Columns: order_id,date,item,amount,status. Empty exports contain headers. Add inclusive start/end date filtering and friendly amount formatting after basic export. Use Product mode and all applicable categories. No rollout or KPI commitments have been supplied; preserve unknowns.' }] } });
await writeFile('run-location.txt', path.relative(root, result.directory));
if (kind === 'scoped-resume') {
  let n = 0;
  const apply = (event) => updateEpicRun({ root, run: result.run, event: { id: `seed-${++n}`, ...event } });
  await apply({ type: 'intake' });
  await apply({ type: 'epic', input: { version: 1, title: 'Order exports', mode: 'product', categories: [{ id: 3, assessed: true, ready: true, content: 'Customers reconcile purchases using their own order CSV.' }, { id: 5, assessed: true, ready: true, content: 'Given a logged-in customer\nWhen they export orders\nThen only their own orders appear as CSV with order_id,date,item,amount,status columns.\nAnd empty exports have headers.' }] } });
  const slices = [
    { id: 'S-1', title: 'Export own orders', summary: 'Download own orders as CSV.', content: 'Given a logged-in customer\nWhen they export\nThen only their own orders appear with order_id,date,item,amount,status columns.\nAnd an empty export contains headers.', hard: [], recommended: [], reasons: {}, parallel: { suitability: 'sequential', reason: 'Supplies export prerequisite.' } },
    { id: 'S-2', title: 'Select date range', summary: 'Filter exports by dates.', content: 'Given an order export\nWhen a customer selects start and end dates\nThen the CSV contains their orders in the selected range.', hard: ['S-1'], recommended: [], reasons: { 'S-1': 'Uses the export outcome.' }, parallel: { suitability: 'unassessed', reason: 'Concurrent code overlap not assessed.' } },
  ];
  await apply({ type: 'slices', input: { version: 1, title: 'Order exports', goal: 'Reconcile purchases', approach: 'Functional', rationale: 'Export then dates.', slices } });
  await apply({ type: 'revise', scope: ['S-2'], reason: 'Clarify inclusive start/end date boundaries.', reference: 'User clarification for resumed run' });
}
