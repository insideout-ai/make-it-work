// Resolve filenames for marked runs while keeping legacy runs on their saved layout.
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
export const prefixed = name => name.startsWith('miw-') ? name : `miw-${name}`;
export function namingVersion(file) {
  const absolute = path.resolve(file), parts = absolute.split(path.sep);
  const index = parts.lastIndexOf('make-it-work');
  if (index < 0 || index === parts.length - 1) return null;
  const base = parts.slice(0, index + 1).join(path.sep) || path.sep;
  let directory = path.dirname(absolute);
  while (directory.startsWith(base + path.sep)) {
    const marker = path.join(directory, 'miw-run.json');
    if (existsSync(marker)) {
      const value = JSON.parse(readFileSync(marker, 'utf8'));
      if (value.artifact_naming_version !== 1) throw new Error(`Unsupported artifact naming: ${marker}`);
      return 1;
    }
    // An established legacy run takes precedence over standalone naming.
    if (existsSync(path.join(directory, 'state.json')) || existsSync(path.join(directory, `${path.basename(directory)}-state.md`))) return 0;
    directory = path.dirname(directory);
  }
  return null;
}
export function artifactPath(file) {
  if (typeof file !== 'string') return file;
  const absolute = path.resolve(file), parts = absolute.split(path.sep);
  const index = parts.lastIndexOf('make-it-work');
  // Never reinterpret the plugin checkout itself or paths outside the artifact tree.
  if (index < 0 || index >= parts.length - 1 || !/\.[a-z0-9]+$/i.test(path.basename(file))) return file;
  const base = parts.slice(0, index + 1).join(path.sep) || path.sep;
  if (existsSync(path.join(base, '.claude-plugin')) || existsSync(path.join(base, '.git'))) return file;
  if (path.basename(file).startsWith('miw-')) return file;
  const version = namingVersion(file);
  if (version === 0 || existsSync(absolute)) {
    if (version === 1 && /-state\.md$|(?:^|\/)state\.json$/.test(file) && existsSync(path.join(path.dirname(absolute), prefixed(path.basename(file))))) throw new Error(`Ambiguous workflow states: ${file} and its miw-prefixed counterpart. Reconcile them before resuming.`);
    return file;
  }
  const candidate = path.join(path.dirname(file), prefixed(path.basename(file)));
  if (existsSync(path.resolve(candidate))) return candidate;
  // Unmarked nested directories may contain user files; standalone outputs are direct children.
  if (version === null && path.dirname(absolute) !== base) return file;
  return path.join(path.dirname(file), prefixed(path.basename(file)));
}
export const artifactJoin = (...parts) => artifactPath(path.join(...parts));
export const artifactResolve = (...parts) => artifactPath(path.resolve(...parts));
export function artifactReference(relative, naming) {
  if (naming !== 1 && naming !== '1') return relative;
  return path.posix.join(path.posix.dirname(relative), prefixed(path.posix.basename(relative)));
}

export function logicalArtifactName(file) {
  const name = path.basename(file);
  const version = namingVersion(file);
  if (version === 0 || !name.startsWith('miw-')) return name;
  if (version === null) return path.resolve(file).split(path.sep).includes('make-it-work') ? name.slice(4) : name;
  let directory = path.dirname(path.resolve(file));
  while (!existsSync(path.join(directory, 'miw-run.json')) && path.dirname(directory) !== directory) directory = path.dirname(directory);
  return name.startsWith(path.basename(directory) + '-') ? name : name.replace(/^miw-/, '');
}

// Standalone writers know they own a new output, even before a workflow state exists.
export function artifactOutputJoin(...parts) {
  const file = path.join(...parts), resolved = artifactPath(file);
  if (resolved !== file || existsSync(path.resolve(file)) || namingVersion(file) === 0 || !/\.[a-z0-9]+$/i.test(path.basename(file))) return resolved;
  const absolute = path.resolve(file), segments = absolute.split(path.sep), index = segments.lastIndexOf('make-it-work');
  if (index < 0 || index >= segments.length - 1 || ['.claude-plugin', '.git'].some(name => existsSync(path.join(segments.slice(0, index + 1).join(path.sep), name)))) return file;
  return path.join(path.dirname(file), prefixed(path.basename(file)));
}
