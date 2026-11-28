#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { artifactJoin, artifactResolve } from '../../../scripts/lib/artifact-path.mjs';
import { calculateImplementationCost } from './implementation-cost-core.mjs';

// Preserve library callers while keeping renderer dependencies off this CLI entry.
export { costEnabled, readImplementationCost, computeCost, calculateImplementationCost } from './implementation-cost-core.mjs';

const snapshotPath = statePath => artifactJoin(path.dirname(statePath), 'implementation-cost.json');

if (process.argv[1] && artifactResolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--state') {
    process.stderr.write('Usage: implementation-cost.mjs --state STATE\n'); process.exitCode = 1;
  } else {
    const result = await calculateImplementationCost(args[1]);
    process.stdout.write(JSON.stringify({ status: result.status, ...(result.usd !== undefined ? { usd: result.usd } : {}),
      ...(result.reason ? { reason: result.reason } : {}), ...(result.version ? { resultPath: snapshotPath(artifactResolve(args[1])) } : {}) }) + '\n');
  }
}
