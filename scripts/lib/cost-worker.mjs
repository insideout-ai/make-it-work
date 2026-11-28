import { parentPort, workerData } from 'node:worker_threads';
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { readCostArchive } from './cost-archive.mjs';
import { estimateArchive } from './cost-estimate.mjs';
import { loadPricing } from './cost-pricing.mjs';

try {
  const handle = await open(workerData.archivePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 256 * 1024 * 1024) throw new Error('Archive size/type unsupported');
    bytes = await handle.readFile();
  } finally { await handle.close(); }
  const archive = readCostArchive(bytes);
  const report = archive.manifest.entries.find(e => e.role === 'report');
  const body = archive.files.get(report?.name)?.toString('utf8') ?? '';
  if (!body.includes(`<!-- run:${workerData.runId} -->`) || !body.includes(`<!-- feedback-state:${workerData.stateHash} -->`)) throw new Error('Archive belongs to a different workflow boundary');
  parentPort.postMessage({ ...estimateArchive(archive, { runId: workerData.runId, ticket: workerData.ticket, pricing: workerData.pricing ?? await loadPricing() }),
    archiveSha256: createHash('sha256').update(bytes).digest('hex') });
} catch {
  parentPort.postMessage({ status: 'unavailable', usd: null, reason: 'The current transcript archive could not be read, validated or priced.' });
}
