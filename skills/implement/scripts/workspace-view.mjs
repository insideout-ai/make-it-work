const escape = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function startPoint(repo) {
  const start = repo.start_point;
  const label = repo.action === 'worktree' ? 'Create isolated worktree at' : repo.action === 'create' ? 'Create at current HEAD' : repo.action === 'switch' ? 'Switch to existing branch at' : 'Keep current HEAD';
  return `${label} ${escape(start?.sha ?? repo.target_head ?? repo.baseline.head)}${repo.action === 'worktree' ? `<br>Source: ${escape(repo.source_root)}<br>Worktree: ${escape(repo.root)}<br>Source local edits stay in the source checkout.` : ''}${start ? `<br>${start.ahead} ahead, ${start.behind} behind ${escape(repo.base)}${start.sha !== repo.base_sha ? '<br><strong>Starting commit differs from base; approval includes this starting point.</strong>' : ''}` : ''}${repo.remote_base ? `<br>Local base: ${repo.remote_base.ahead} ahead, ${repo.remote_base.behind} behind ${escape(repo.remote_base.ref)} (${escape(repo.remote_base.sha)}; local tracking ref, no fetch)` : '<br>Remote-tracking base unavailable; freshness unknown.'}`;
}

export function renderScopePreview(journal) {
  const rows = journal.plan.repos.map((repo) => `<tr><td>${escape(repo.id)}</td><td>${escape(repo.role)}</td><td>${escape(repo.reason)}</td><td>${escape(repo.baseline.branch)}</td><td>${escape(repo.base)}</td><td>${escape(repo.action)} → ${escape(repo.branch)}<br>${startPoint(repo)}</td><td>${escape(journal.progress[repo.id]?.status ?? 'Pending')}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="15"><title>${escape(journal.plan.ticket)} — Repository selection</title><style>body{font:16px system-ui;margin:40px auto;max-width:1200px;padding:0 24px;color:#243147;background:#f6f8fb}table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;padding:14px;border-bottom:1px solid #dde3eb}code{overflow-wrap:anywhere}.scroll{overflow:auto}</style></head><body><h1>${escape(journal.plan.ticket)} — Repository selection</h1><p>Workspace: ${escape(journal.plan.artifact_root)}</p><p>${journal.plan.repos.length} selected repositories · ${escape(journal.status)}</p><p>Confirm the exact repository and branch selection in chat before branch creation or switching.</p><div class="scroll"><table><thead><tr><th>Repository</th><th>Role</th><th>Selection evidence</th><th>Current branch</th><th>Base</th><th>Proposed action</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div><p>Plan hash: <code>${escape(journal.hash)}</code></p>${journal.error ? `<p>${escape(journal.error)}</p>` : ''}<h2>Selection history</h2><ul>${journal.history.map((item) => `<li>${escape(item.time)} · ${escape(item.status)} · ${escape(item.repos.map((repo) => `${repo.id}: ${repo.branch} → ${repo.base}`).join('; '))}</li>`).join('') || '<li>No earlier selection</li>'}</ul></body></html>`;
}

export function renderWorkspacePanel(state, scope = null) {
  if (state.fields.workspace_version !== '1') return '';
  const contract = JSON.parse(state.fields.workspace_contract);
  const snapshots = JSON.parse(state.fields.workspace_snapshot);
  const locationLabel = contract.checkout === 'worktree' ? 'Worktree location' : 'Checkout location';
  const rows = contract.repos.map((repo) => {
    const current = snapshots.find((entry) => entry.root === repo.root);
    const mismatch = current?.branch && current.branch !== repo.branch
      ? ` <strong>⚠ Branch differs from approved: ${escape(repo.branch)}</strong>` : '';
    return `<tr><td><strong>${escape(repo.id)}</strong><details class="repository-location"><summary>${locationLabel}</summary><p>${escape(repo.root)}</p></details></td><td>${escape(current?.branch ?? 'Unknown')}${mismatch}</td><td>${escape(repo.base)}</td></tr>`;
  }).join('');
  const proposed = scope && scope.hash !== contract.approval_hash ? `<h3>Proposed scope change — ${escape(scope.status)}</h3><p>The workflow still uses the approved scope below until the revised selection is approved, applied and registered.</p><ul>${scope.plan.repos.map((repo) => `<li>${escape(repo.id)}: ${escape(repo.action)} → ${escape(repo.branch)} (base ${escape(repo.base)}) · ${escape(repo.reason)}<br>${startPoint(repo)}</li>`).join('')}</ul>` : '';
  return `<section class="panel" aria-label="Repositories">${proposed}<div style="overflow-x:auto"><table><thead><tr><th>Repository</th><th>Working branch</th><th>Base</th></tr></thead><tbody>${rows}</tbody></table></div>${scope?.history?.length ? `<details><summary>Selection history</summary><ul>${scope.history.map((item) => `<li>${escape(item.time)} · ${escape(item.status)} · ${escape(item.repos.map((repo) => repo.id).join(', '))}</li>`).join('')}</ul></details>` : ''}</section>`;
}
