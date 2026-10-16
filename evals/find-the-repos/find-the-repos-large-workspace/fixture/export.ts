export function downloadReportCsv(columns: string[], rows: string[][]): string {
  return [columns, ...rows].map(row => row.join(',')).join('\n');
}
