import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeAssurance } from './assurance-summary.mjs';

const complete = () => ({
  acceptance: [{ criterion: 'AC1', scenario: 'Behavior', status: 'automated', note: 'Actual assertion passed' }],
  repos: [{ name: 'app' }], review_scope: [{ repo: 'app', status: 'covered', uncovered_paths: [] }],
  ui_verification: { status: 'not-applicable', note: 'Pure library change' },
  validation: { mode: 'full-suite', result: 'pass' }, open_nits: [], known_regressions: [],
});

test('passing acceptance cannot hide partial delivery review or pending browser checks', () => {
  const pkg = complete();
  pkg.review_scope = [{ repo: 'app', status: 'partial', uncovered_paths: ['src/earlier.js'] }, { repo: 'api', status: 'unknown', uncovered_paths: [] }];
  pkg.ui_verification = { status: 'pending', note: 'Backend unavailable; layout unchecked' };
  const summary = summarizeAssurance(pkg);
  assert.equal(summary.label, 'Limited');
  assert.match(summary.text, /delivery review partial \(app\).*delivery review unknown \(api\).*browser verification pending/);
  assert.equal(pkg.acceptance[0].status, 'automated');
});

test('every pending clause keeps acceptance limits in the overall headline', () => {
  const pkg = complete();
  pkg.acceptance.push({ criterion: 'AC1', scenario: 'Error path', status: 'unverified', note: 'Service unavailable' });
  assert.match(summarizeAssurance(pkg).text, /acceptance verification pending \(1 of 1 criterion\)/);
});

test('absent legacy evidence is unknown, including when no changed paths exist', () => {
  const pkg = complete(); delete pkg.acceptance; delete pkg.review_scope; delete pkg.ui_verification;
  assert.match(summarizeAssurance(pkg).text, /acceptance verification not recorded.*delivery review unknown.*browser verification pending/);
  pkg.repos = [];
  assert.match(summarizeAssurance(pkg).text, /delivery review scope unknown/);
});

test('manual acceptance and Lightweight checks do not imply a passing automated gate', () => {
  const pkg = complete(); pkg.acceptance[0].status = 'manual';
  pkg.validation = { mode: 'none', result: 'manual-accepted' };
  assert.match(summarizeAssurance(pkg).text, /automated regression unavailable; manual gate accepted/);
  assert.doesNotMatch(summarizeAssurance(pkg).text, /acceptance verification pending/);
  pkg.validation = { mode: 'lightweight', result: 'Lightweight — no regression gate; verified by independent review' };
  delete pkg.acceptance;
  assert.match(summarizeAssurance(pkg).text, /acceptance verification not recorded.*no regression gate \(Lightweight\)/);
});

test('open advisories and known regressions stay visible despite passing checks', () => {
  const pkg = complete(); pkg.open_nits = ['Unconfirmed identifier']; pkg.known_regressions = ['Unrelated lint errors', 'Existing CI failure'];
  assert.match(summarizeAssurance(pkg).text, /1 open review nit; 2 known unrelated regressions/);
});

test('only complete recorded checks produce the qualified complete label; browser passed and not-applicable both qualify', () => {
  const pkg = complete();
  assert.deepEqual(summarizeAssurance(pkg), { label: 'Recorded checks complete', text: 'Recorded checks complete', limitations: [] });
  pkg.ui_verification = { status: 'passed', note: 'Observed the requested UI behaviors' };
  assert.equal(summarizeAssurance(pkg).label, 'Recorded checks complete');
  pkg.validation.result = 'fail';
  assert.equal(summarizeAssurance(pkg).label, 'Limited');
});
