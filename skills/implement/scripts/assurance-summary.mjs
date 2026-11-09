/** Presentation of package evidence only; never changes completion or delivery eligibility. */
import { summarizeAcceptance } from './acceptance-summary.mjs';
import { uiVerification } from '../../../scripts/lib/review-evidence.mjs';

export function summarizeAssurance(pkg) {
  const acceptance = summarizeAcceptance(pkg.acceptance);
  const scope = pkg.review_scope ?? pkg.repos.map((repo) => ({ repo: repo.name, status: 'unknown' }));
  const ui = uiVerification(pkg.ui_verification);
  const limitations = [];
  if (!acceptance) limitations.push('acceptance verification not recorded');
  else if (acceptance.pending) limitations.push(`acceptance verification pending (${acceptance.pending} of ${acceptance.total} ${acceptance.total === 1 ? 'criterion' : 'criteria'})`);
  if (!scope.length) limitations.push('delivery review scope unknown');
  for (const repo of scope) if (repo.status !== 'covered') limitations.push(`delivery review ${repo.status} (${repo.repo})`);
  if (ui.status === 'pending') limitations.push('browser verification pending');
  if (pkg.validation.mode === 'lightweight') limitations.push('no regression gate (Lightweight)');
  else if (pkg.validation.result === 'manual-accepted') limitations.push('automated regression unavailable; manual gate accepted');
  else if (pkg.validation.mode === 'none') limitations.push('no automated regression gate');
  else if (!['pass', 'PASS'].includes(pkg.validation.result)) limitations.push(`validation ${pkg.validation.result}`);
  if (pkg.open_nits.length) limitations.push(`${pkg.open_nits.length} open review nit${pkg.open_nits.length === 1 ? '' : 's'}`);
  if (pkg.known_regressions.length) limitations.push(`${pkg.known_regressions.length} known unrelated regression${pkg.known_regressions.length === 1 ? '' : 's'}`);
  const label = limitations.length ? 'Limited' : 'Recorded checks complete';
  return { label, text: limitations.length ? `${label} — ${limitations.join('; ')}` : label, limitations };
}
