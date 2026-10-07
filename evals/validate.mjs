import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVAL_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.dirname(EVAL_ROOT);

async function textFile(file) {
  return readFile(file, 'utf8');
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function field(source, key) {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim();
}

export async function discoverCases(root = EVAL_ROOT) {
  const cases = [];
  for (const skillEntry of await readdir(root, { withFileTypes: true })) {
    if (!skillEntry.isDirectory() || skillEntry.name === 'results') continue;
    const skillDir = path.join(root, skillEntry.name);
    for (const caseEntry of await readdir(skillDir, { withFileTypes: true })) {
      if (!caseEntry.isDirectory()) continue;
      const caseDir = path.join(skillDir, caseEntry.name);
      if (!(await exists(path.join(caseDir, 'case.yaml')))) continue;
      const yaml = await textFile(path.join(caseDir, 'case.yaml'));
      cases.push({
        skill: skillEntry.name,
        dir: caseDir,
        name: field(yaml, 'name'),
        scaffold: /scaffold_script:\s*fixture\.sh/.test(yaml),
      });
    }
  }
  return cases.sort((a, b) => a.name.localeCompare(b.name));
}

export async function validateEvalTree(root = EVAL_ROOT) {
  const errors = [];
  const cases = await discoverCases(root);
  const suites = JSON.parse(await textFile(path.join(root, 'suites.json')));
  const byName = new Map();
  const publicSkills = (await readdir(path.join(path.dirname(root), 'skills'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  if (suites.schemaVersion !== 1) errors.push('suites.json: schemaVersion must be 1');
  for (const item of cases) {
    if (!item.name || !/^[a-z0-9-]+$/.test(item.name)) {
      errors.push(`${item.dir}: invalid or missing case name`);
      continue;
    }
    if (byName.has(item.name)) errors.push(`duplicate case name: ${item.name}`);
    byName.set(item.name, item);
    if (!(await exists(path.join(item.dir, 'prompt.md')))) errors.push(`${item.name}: missing prompt.md`);
    const graderDir = path.join(item.dir, 'graders');
    if (!(await exists(graderDir))) {
      errors.push(`${item.name}: missing graders directory`);
    } else {
      const graderNames = (await readdir(graderDir)).filter((name) => name.endsWith('.md'));
      if (!graderNames.length) errors.push(`${item.name}: no graders`);
      for (const graderName of graderNames) {
        const grader = await textFile(path.join(graderDir, graderName));
        const type = field(grader, 'type');
        if (!grader.startsWith('---\n') || !['file_exists', 'llm', 'regex', 'tool_used'].includes(type)) {
          errors.push(`${item.name}/${graderName}: invalid grader frontmatter or type`);
        }
      }
    }
    const fixturePath = path.join(item.dir, 'fixture.sh');
    if (item.scaffold && !(await exists(fixturePath))) errors.push(`${item.name}: missing fixture.sh`);
    if (!item.scaffold && await exists(fixturePath)) errors.push(`${item.name}: fixture.sh is not referenced by case.yaml`);
    if (item.scaffold && await exists(fixturePath)) {
      const fixture = await textFile(fixturePath);
      if (!/assert-disposable-cwd\.sh|PLUGIN_ROOT|plugin_root|REPO_ROOT|repo_root/.test(fixture)) {
        errors.push(`${item.name}: fixture.sh lacks a plugin-checkout guard`);
      }
    }
  }

  if (!Array.isArray(suites.smoke) || suites.smoke.length !== publicSkills.length) {
    errors.push(`smoke tier must contain exactly one case for each of ${publicSkills.length} public skills`);
  }
  const smokeNames = new Set();
  const smokeSkills = new Set();
  for (const name of suites.smoke ?? []) {
    if (smokeNames.has(name)) errors.push(`duplicate smoke case: ${name}`);
    smokeNames.add(name);
    const item = byName.get(name);
    if (!item) errors.push(`unknown smoke case: ${name}`);
    else if (smokeSkills.has(item.skill)) errors.push(`multiple smoke cases for ${item.skill}`);
    else smokeSkills.add(item.skill);
  }
  for (const skill of publicSkills) if (!smokeSkills.has(skill)) errors.push(`no smoke case for ${skill}`);

  for (const name of suites.headless ?? []) if (!byName.has(name)) errors.push(`unknown headless case: ${name}`);
  for (const [name, tools] of Object.entries(suites.extraTools ?? {})) {
    if (!byName.has(name)) errors.push(`unknown extraTools case: ${name}`);
    if (!Array.isArray(tools) || tools.some((tool) => typeof tool !== 'string')) {
      errors.push(`invalid extraTools entry: ${name}`);
    }
  }
  return { cases, suites, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { cases, suites, errors } = await validateEvalTree();
  if (errors.length) {
    for (const error of errors) process.stderr.write(`ERROR: ${error}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Validated ${cases.length} eval cases; smoke covers ${suites.smoke.length} skills.\n`);
  }
}
