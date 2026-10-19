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
