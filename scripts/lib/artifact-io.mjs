import { writeFile as write, readFile as read, mkdir as make } from 'node:fs/promises';
import { artifactPath } from './artifact-path.mjs';
import { protectArtifact } from './artifact-git.mjs';
export async function writeFile(file, ...options) {
  const target = file; await protectArtifact(target); return write(target, ...options);
}
export const readFile = (file, ...options) => read(artifactPath(file), ...options);
export async function mkdir(directory, ...options) { await protectArtifact(directory); return make(directory, ...options); }
