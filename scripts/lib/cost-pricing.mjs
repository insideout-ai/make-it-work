// Rates are USD per million tokens, verified against this official source.
export const PRICING_URL = 'https://platform.claude.com/docs/en/about-claude/pricing.md';
const rate = (input, output, read = input / 10) => ({ input, output, write5m: input * 1.25, write1h: input * 2, read });
export const BUNDLED_PRICING = {
  source: PRICING_URL, verifiedAt: '2026-11-28', origin: 'bundled',
  models: Object.fromEntries([
    ...['4.5', '4.6', '4.7', '4.8', '5'].map(v => [`claude-opus-${v.replace('.', '-')}`, rate(5, 25)]),
    ['claude-opus-5-5', rate(4, 20, 0.2)],
    ...['4', '4-1'].map(v => [`claude-opus-${v}`, rate(15, 75)]),
    ...['4', '4-5', '4-6'].map(v => [`claude-sonnet-${v}`, rate(3, 15)]),
    ['claude-sonnet-5', rate(2, 10)], ['claude-sonnet-5-5', rate(2, 10, 0.1)],
    ['claude-haiku-4-5', rate(1, 5)],
    ...['fable', 'mythos'].flatMap(v => [[`claude-${v}-5`, rate(10, 50)], [`claude-${v}-5-1`, rate(10, 50, 0.25)], [`claude-${v}-5-2`, rate(8, 40, 0.2)]]),
  ]),
};

export function modelKey(model) {
  return typeof model === 'string' ? model.replace(/-\d{8}$/, '') : '';
}

// Deliberately recognize one documented table shape. Never scrape later batch,
// fast-mode or regional tables as if they were base pricing.
export function parsePricing(markdown) {
  const section = markdown.match(/^## Model pricing\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1];
  if (!section?.includes('| Model | Base input tokens | 5m cache writes | 1h cache writes | Cache hits and refreshes | Output tokens |')) throw new Error('Unrecognized pricing table');
  const models = {};
  for (const line of section.split('\n')) {
    const cells = line.split('|').slice(1, -1).map(s => s.trim());
    if (cells.length !== 6) continue;
    const name = cells[0].match(/^Claude (Opus|Sonnet|Haiku|Fable|Mythos) (\d+(?:\.\d+)?)(?:$| \(\[)/);
    if (!name) continue; // Conditional/tiered model rows require explicit support.
    const values = cells.slice(1).map(cell => {
      const match = cell.match(/^\$(\d+(?:\.\d+)?) \/ MTok(?:<sup>\d+<\/sup>)?$/);
      return match ? Number(match[1]) : NaN;
    });
    if (values.some(n => !Number.isFinite(n) || n <= 0 || n > 1000)) throw new Error('Invalid pricing value');
    const [input, write5m, write1h, read, output] = values;
    if (Math.abs(write5m - input * 1.25) > 1e-8 || Math.abs(write1h - input * 2) > 1e-8 || read > input || output < input) throw new Error('Inconsistent pricing categories');
    const key = `claude-${name[1].toLowerCase()}-${name[2].replace('.', '-')}`;
    if (models[key]) throw new Error('Duplicate pricing row');
    models[key] = { input, write5m, write1h, read, output };
  }
  if (!models['claude-sonnet-4-6'] || !models['claude-opus-4-6']) throw new Error('Missing pricing anchors');
  return { source: PRICING_URL, verifiedAt: new Date().toISOString(), origin: 'fetched', models };
}

export async function loadPricing(fetcher = fetch) {
  try {
    const response = await fetcher(PRICING_URL, { signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (!response.ok) throw new Error('Pricing fetch failed');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 1024 * 1024) { await response.body.cancel?.().catch(() => {}); throw new Error('Pricing response too large'); }
      chunks.push(chunk);
    }
    return parsePricing(Buffer.concat(chunks).toString('utf8'));
  } catch { return { ...BUNDLED_PRICING, fallbackReason: 'Official pricing unavailable or unrecognized; bundled documented rates used.' }; }
}
