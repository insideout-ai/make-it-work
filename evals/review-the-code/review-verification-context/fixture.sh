#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
mkdir -p src make-it-work/REVIEW-2
review_plugin_root="$(cd "$SCRIPT_DIR/../../.." && pwd)"
printf '%s\n' "$review_plugin_root/skills/review-the-code/SKILL.md" > make-it-work/REVIEW-2/review-skill-path.txt
cat > package.json <<'JSON'
{"name":"item-service-fixture","private":true,"type":"module"}
JSON
cat > CLAUDE.md <<'DOC'
# Item service fixture
This repository has no domain skills or onboarding gate. Follow the accepted spec.
Infrastructure configuration and deployed gateway evidence are unavailable here.
DOC
printf 'export const items = [];\n' > src/items.js
git init -q -b main
git add .
git -c user.name=fixture -c user.email=fixture@example.invalid commit -qm 'Baseline'
git switch -qc feature/internal-items
cat > src/internalItems.js <<'JS'
// Adapter for POST /internal/items. tokenValid comes from the JWT middleware.
export function internalItems(request, items) {
  if (!request.tokenValid) return { status: 401, items: [] };
  const selected = new Set(request.workerIds);
  return { status: 200, items: items.filter(item => selected.has(item.workerId))
    .map(({ id, workerId }) => ({ id, workerId })) };
}
JS
cat > make-it-work/REVIEW-2/REVIEW-2-spec.md <<'DOC'
# Accepted spec
Return slim item ids and worker ids for the requested workers through POST /internal/items.
The endpoint must be accessible only to internal service callers. Ordinary user tokens must not grant access.
Empty worker ids return an empty list. No organization lookup is required for an authorized internal service.
DOC
cat > make-it-work/REVIEW-2/review-target.json <<'JSON'
{"verification_context":{"mode":"lightweight","policy":[{"Repo":"item-service-fixture","Mode":"manual","Decision":"user","Reason":"User explicitly chose manual verification; no new automated tests required in this run"}],"retained_decisions":{"source":"user","via":"chat","decisions":[{"decision":"Review by inspection now; perform manual behavior checks elsewhere","reference":"Explicit fresh-run retention choice","unverified":["Deployed internal-only access","Observed endpoint behavior"]}]}}}
JSON
cat > make-it-work/REVIEW-2/implementation.md <<'DOC'
# Implementation hand-back
No build, test or deployed request was performed. There is no plan or verification ledger.
The endpoint follows an existing JWT-only pattern. Gateway protection is assumed, not verified.
There is no gateway configuration or service-identity check in this repository.
DOC
