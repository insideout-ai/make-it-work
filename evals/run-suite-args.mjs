import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

export function caseTools({ skill, name, tools, suites }) {
  return [...new Set([...tools, ...(suites.extraTools?.[name] ?? []), ...(suites.requiredToolsBySkill?.[skill] ?? [])])];
}

export function pluginEvalArgs({ name, caseReportDir, remaining, tools, scaffold, model, judgeModel }) {
  const args = ['plugin', 'eval', '.', '--case', name, '--ablation', 'none', '--runs', '1',
    '--trust-plugin', '--no-publish', '--threshold', '0', '--output-dir', caseReportDir,
    '--max-cost-usd', remaining.toFixed(2)];
  if (tools.length) args.push('--allow-tools', ...tools);
  if (scaffold) args.push('--scaffold');
  if (model) args.push('--model', model);
  if (judgeModel) args.push('--judge-model', judgeModel);
  return args;
}


export async function caseWorkingDirectory(fixtureDir, relative = '.') {
  if (typeof relative !== 'string' || !relative.trim() || path.isAbsolute(relative) || relative.includes('\\') || relative.includes('\0') || relative.split('/').includes('..')) {
    throw new Error('working_directory must be a relative directory inside the fixture.');
  }
  const root = await realpath(fixtureDir);
  const directory = await realpath(path.resolve(root, relative));
  if (directory !== root && !directory.startsWith(root + path.sep)) throw new Error('working_directory escapes the fixture.');
  if (!(await stat(directory)).isDirectory()) throw new Error('working_directory must name a directory.');
  return directory;
}
