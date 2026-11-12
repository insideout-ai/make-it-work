// Run-bound local observations; no conversation or source contents are retained.
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { atomicWrite, withLock } from '../../../scripts/lib/artifacts.mjs';

const location = statePath => path.join(path.dirname(statePath), 'feedback-observations.json');
export async function readFeedbackReceipts(statePath, binding) {
  try {
    const file = location(statePath);
    if (!(await lstat(file)).isFile()) return null;
    const value = JSON.parse(await readFile(file, 'utf8'));
    if (value.version !== 1 || value.runId !== binding.runId || value.stateHash !== binding.stateHash ||
        !Array.isArray(value.packets) || value.packets.some(hash => !/^[a-f0-9]{64}$/.test(hash)) ||
        !Array.isArray(value.dispatches) || value.dispatches.some(item => typeof item.id !== 'string' || !Number.isFinite(Date.parse(item.at)))) return null;
    return value;
  } catch { return null; }
}

export async function recordFeedbackReceipt(statePath, binding, observation) {
  const file = location(statePath);
  return withLock(file, async () => {
    try { if (!(await lstat(file)).isFile()) throw new Error('Feedback observations must be a regular file.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const value = await readFeedbackReceipts(statePath, binding) ?? { version: 1, runId: binding.runId, stateHash: binding.stateHash, packets: [], dispatches: [] };
    if (observation.inspect) {
      value.inspectedAt ??= new Date().toISOString();
      value.analysisRequired = observation.analysisRequired === true;
    }
    if (observation.packetHash && !value.packets.includes(observation.packetHash)) value.packets.push(observation.packetHash);
    for (const dispatch of observation.dispatches ?? []) if (!value.dispatches.some(item => item.id === dispatch.id)) value.dispatches.push(dispatch);
    await atomicWrite(file, JSON.stringify(value) + '\n');
    return value;
  });
}
