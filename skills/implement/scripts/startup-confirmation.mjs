// A receipt for runtime-provided assistant text, never user approval or tool output.
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertRunState } from './artifact-layout.mjs';
import { parseState } from './render-status.mjs';

const sha = (text) => createHash('sha256').update(text).digest('hex');
const receiptPath = (statePath) => path.join(path.dirname(statePath), 'startup-confirmation.json');

export function hasDashboardLink(text, dashboard) {
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  return [...prose.matchAll(/\[Open implementation dashboard\]\(<?([^>\n]*?)>?\)/g)].some((match) => {
    try { return decodeURIComponent(match[1]) === dashboard; } catch { return false; }
  });
}

async function binding(input, progress) {
  const initialized = progress.initialized;
  const state = parseState(await readFile(initialized.state, 'utf8'), initialized.state);
  assertRunState(path.dirname(path.dirname(path.dirname(path.resolve(initialized.state)))), initialized.state, state.fields.ticket);
  return { version: 1, runId: state.fields.start_time,
    sessionHash: sha(`${input.session_id ?? ''}\0${path.resolve(input.transcript_path)}`),
    initializationHash: sha(progress.initializationId), dashboardHash: sha(initialized.dashboard) };
}

export async function readStartupConfirmation(input, progress) {
  if (!progress.initialized || !progress.initializationId) return null;
  let file;
  try {
    const expected = await binding(input, progress);
    file = await open(receiptPath(progress.initialized.state), constants.O_RDONLY | constants.O_NOFOLLOW);
    if (!(await file.stat()).isFile()) return null;
    const saved = JSON.parse(await file.readFile('utf8'));
    if (Object.keys(saved).sort().join(',') !== 'dashboardHash,initializationHash,messageHash,runId,sessionHash,source,version' ||
        saved.source !== 'Stop' || !/^[a-f0-9]{64}$/.test(saved.messageHash ?? '') ||
        Object.entries(expected).some(([key, value]) => saved[key] !== value)) return null;
    return saved;
  } catch { return null; } // Stale or unreadable receipts are never evidence.
  finally { await file?.close(); }
}

export async function saveStartupConfirmation(input, progress) {
  // The caller must first match the exact clickable dashboard link in this
  // runtime Stop payload. No other hook or transcript text can mint a receipt.
  if (input.hook_event_name !== 'Stop' || typeof input.last_assistant_message !== 'string' ||
      !hasDashboardLink(input.last_assistant_message, progress.initialized.dashboard)) throw new Error('Startup confirmation requires runtime Stop text.');
  const saved = { ...await binding(input, progress), source: 'Stop', messageHash: sha(input.last_assistant_message) };
  const target = receiptPath(progress.initialized.state);
  try {
    if (!(await lstat(target)).isFile()) throw new Error('Startup confirmation must be a regular file.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(saved)}\n`, { flag: 'wx', mode: 0o600 });
    await rename(temporary, target);
  } finally { await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
  return saved;
}

export function isConfirmationBoundary(input, receipt) {
  return input.hook_event_name === 'Stop' && typeof input.last_assistant_message === 'string' &&
    receipt?.messageHash === sha(input.last_assistant_message);
}
