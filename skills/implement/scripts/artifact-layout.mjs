import { artifactReference } from '../../../scripts/lib/artifact-path.mjs';
import { artifactJoin, artifactResolve } from '../../../scripts/lib/artifact-path.mjs';
import path from 'node:path';

const fail = (message) => { throw new Error(message); };

export function runDirectory(root, ticket) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ticket)) fail('Unsafe ticket for run directory.');
  return path.join(root, 'make-it-work', ticket);
}

export function runArtifact(ticket, filename, naming = 0) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ticket)) fail('Unsafe ticket for run artifact.');
  if (filename !== path.posix.basename(filename) || filename === '.' || filename === '..') fail('Unsafe artifact filename.');
  return artifactReference(`make-it-work/${ticket}/${filename}`, naming);
}

export function assertRunState(root, statePath, ticket) {
  const directory = runDirectory(root, ticket);
  if (artifactResolve(statePath) !== artifactJoin(directory, `${ticket}-state.md`)) {
    fail(`State must be ${runArtifact(ticket, `${ticket}-state.md`)}.`);
  }
  return directory;
}

export function runArtifactName(relative, ticket, field = 'artifact') {
  const prefix = `make-it-work/${ticket}/`;
  if (typeof relative !== 'string' || !relative.startsWith(prefix)) fail(`${field} must be under ${prefix}`);
  const filename = relative.slice(prefix.length);
  if (!filename || filename !== path.posix.basename(filename) || filename === '.' || filename === '..') {
    fail(`${field} must be a direct child of ${prefix}`);
  }
  return filename;
}
