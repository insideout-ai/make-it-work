import { expect, test } from 'vitest';
import { lineTotal } from './lineTotal.js';

test('calculates a line total', () => {
  expect(lineTotal(2, 50)).toBe(100);
});
