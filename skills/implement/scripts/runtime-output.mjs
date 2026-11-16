// Parse complete runtime JSON only. A truncated projection is never evidence.
export function runtimeObjects(output) {
  if (typeof output !== 'string') return [];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  try {
    const value = JSON.parse(output);
    return object(value) ? [value] : [];
  } catch { /* A stream may contain independent JSONL envelopes. */ }
  return output.split('\n').flatMap(line => {
    try { const value = JSON.parse(line); return object(value) ? [value] : []; }
    catch { return []; }
  });
}
