import { digest, fail, section } from './artifacts.mjs';

export function planHash(markdown) {
  return digest(markdown.replace(/^## Execution Status\s*\n[\s\S]*?(?=^## |$(?![\s\S]))/m, ''));
}

export function parseSteps(markdown) {
  const body = section(markdown, 'Steps');
  if (!body) fail('Plan has no Steps section.');
  const matches = [...body.matchAll(/^### Step (\d+)\s*[—–-]\s*(.+)$/gm)];
  if (!matches.length) fail('Plan has no numbered steps.');
  const steps = matches.map((match, i) => {
    const number = Number(match[1]);
    if (number !== i + 1) fail('Steps must be numbered consecutively from 1.');
    const content = body.slice(match.index + match[0].length, matches[i + 1]?.index).trim();
    const field = (name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const value = content.match(new RegExp(`(?:^|\\n)(?:- )?\\*\\*${escaped}:?\\*\\*:?\\s*([\\s\\S]*?)(?=\\n(?:- )?\\*\\*|$(?![\\s\\S]))`));
      return value?.[1].trim() ?? null;
    };
    const references = (name) => {
      const value = field(name);
      if (!value || /^none\b/i.test(value)) return [];
      const ids = [...value.matchAll(/\b(?:Step\s+)?(\d+)\b/gi)].map((m) => Number(m[1]));
      if (!ids.length || new Set(ids).size !== ids.length) fail(`Step ${number}: malformed ${name}.`);
      return ids;
    };
    const files = [...(field('Files') ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    return { number, title: match[2], content, files, depends: references('Depends on'), parallel: references('Can run in parallel with'), verify: field('Verify') ?? content.match(/\*\*Verify:\*\*[ \t]*([^\n]+)/)?.[1] ?? null, tests: field('Tests') };
  });
  for (const step of steps) {
    for (const dep of step.depends) if (dep < 1 || dep >= step.number) fail(`Step ${step.number} depends on invalid/later step ${dep}.`);
    for (const peer of step.parallel) if (peer < 1 || peer > steps.length || peer === step.number) fail(`Step ${step.number} has invalid parallel step ${peer}.`);
  }
  return steps;
}
export function nextBatch(steps, completed, parallel = false) {
  const remaining = steps.slice(completed);
  if (!remaining.length) return [];
  const chosen = [remaining[0]];
  if (chosen[0].depends.some((id) => id > completed)) fail('Next step dependencies are incomplete.');
  if (parallel) for (const step of remaining.slice(1)) {
    if (step.depends.some((id) => id > completed) || chosen.some((peer) => !step.parallel.includes(peer.number) || !peer.parallel.includes(step.number) || step.files.some((file) => peer.files.includes(file)))) break;
    chosen.push(step);
  }
  return chosen.map((step) => step.number);
}
