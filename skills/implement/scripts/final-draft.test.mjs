import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCommitMessage } from './final-draft.mjs';

test('explicit wrapping preserves subject, code, trailers, words and PR-independent data', () => {
  const subject = 'fix: a subject intentionally longer than the configured prose width';
  const code = 'const example = "a long code line stays byte exact even beyond the limit";';
  const trailer = 'Co-authored-by: Example Contributor With A Long Name <example@example.test>';
  const message = `${subject}\n\nThis paragraph records the actual failing compiler status and unknown baseline attribution.\n\n- This list item retains its words while wrapping with a hanging indent.\n\n\`\`\`js\n${code}\n\`\`\`\n\n${trailer}\n continuation text stays exactly as supplied\n`;
  const wrapped = formatCommitMessage(message, 40);
  assert.ok(wrapped.startsWith(subject + '\n'));
  assert.ok(wrapped.includes(`\`\`\`js\n${code}\n\`\`\``));
  assert.ok(wrapped.endsWith(trailer + '\n continuation text stays exactly as supplied\n'));
  assert.deepEqual(wrapped.split(/\s+/), message.split(/\s+/));
  assert.match(wrapped, /\n  /);
  assert.equal(formatCommitMessage(message), message);
  for (const width of [0, 19, 40.5, NaN, 1001]) assert.throws(() => formatCommitMessage(message, width), /Body width/);
});
