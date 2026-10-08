export function pluginEvalArgs({ name, caseReportDir, remaining, tools, scaffold }) {
  const args = ['plugin', 'eval', '.', '--case', name, '--ablation', 'none', '--runs', '1',
    '--trust-plugin', '--no-publish', '--threshold', '0', '--output-dir', caseReportDir,
    '--max-cost-usd', remaining.toFixed(2)];
  if (tools.length) args.push('--allow-tools', ...tools);
  if (scaffold) args.push('--scaffold');
  return args;
}
