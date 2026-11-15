#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../implement-autopilot-full/fixture.sh"
printf '/make-it-work/\n' > .gitignore
git add .gitignore
git -c user.name=fixture -c user.email=fixture@example.invalid commit -qm 'Ignore run artifacts'

mkdir -p config
cat > config/required-role-map.json <<'POLICY'
{"roles":{"member":"member","guest":"guest"},"rule":"An authoritative administrator mapping is required; no best guess is permitted."}
POLICY
git add config/required-role-map.json
git -c user.name=fixture -c user.email=fixture@example.invalid commit -qm 'Supply role map with an unresolved administrator mapping'
git switch -qc DEMO-REFINE
MIW_REFINEMENT_FIXTURE_PLUGIN="$SCRIPT_DIR/../../.." node --input-type=module <<'SEED'
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
const plugin=path.resolve(process.env.MIW_REFINEMENT_FIXTURE_PLUGIN);
const {initializeWorkflow,applyWorkflow}=await import(pathToFileURL(path.join(plugin,'skills/implement/scripts/workflow.mjs')));
const {digest}=await import(pathToFileURL(path.join(plugin,'scripts/lib/artifacts.mjs')));
const root=process.cwd();
const run=await initializeWorkflow(root,{ticket:'DEMO-REFINE',autonomy:'autopilot',refinement_worker:true,base:'main',repos:[root],branch_guard:'Existing approved feature branch'});
await applyWorkflow({root,statePath:run.state,input:{id:'context-ready',event:'context-ready',repos:[root],expected_hash:digest(await readFile(run.state,'utf8')),outcome:'Context precheck complete; the refinement worker must inspect the role-map contents.'}});
SEED
