import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generateArtifactPreviews, renderArtifactPreview } from './lib/artifact-preview.mjs';

const options = { filename: 'Session spec.md', originalHref: 'Session%20spec.md', dashboardHref: 'status.html' };
const example = `# Add payment details to the session line

Show the **payment date** in each session row. An ordinary paragraph should wrap naturally within the reader.

## Acceptance criteria

\`\`\`gherkin
Scenario: Paid session shows its payment date
  Given a session marked as payment received with a payment date
  When I view the Sessions page
  Then the row shows the payment date in dd/MM/yy format
\`\`\`

## Decision log

| Question | Answer |
| --- | --- |
| Unpaid session? | Show “–” |

- Preserve the original document
- [ ] Review the layout

[Acceptance criteria](#acceptance-criteria)
`;

test('renders the session spec as a standalone, offline document', () => {
  const html = renderArtifactPreview(example, options);
  assert.match(html, /<h1 id="add-payment-details-to-the-session-line">/);
  assert.match(html, /<strong>payment date<\/strong>/);
  assert.match(html, /<pre><code class="language-gherkin">Scenario:/);
  assert.match(html, /<th>Question<\/th>/);
  assert.match(html, /<td>Show “–”<\/td>/);
  assert.match(html, /<input disabled="" type="checkbox">/);
  assert.match(html, /href="#acceptance-criteria"/);
  assert.match(html, /id="acceptance-criteria"/);
  assert.match(html, /href="Session%20spec.md">Open original/);
  assert.match(html, /href="status.html">Back to dashboard/);
  assert.doesNotMatch(html, /<script|<link|http-equiv="refresh"/);
});

test('escapes raw HTML and rejects executable links, including encoded schemes', () => {
  const markdown = `<script>alert(1)</script>

<img src=x onerror=alert(1)>

[bad](javascript:alert%281%29) [entity](javascript&#58;alert%281%29)
[control](java&#x09;script:alert%281%29) [data](data:text/html,test)
[encoded](%6aavascript:alert%281%29) [external](https://example.com)
![remote](https://example.com/tracker.png) ![local](diagram.png)
`;
  const html = renderArtifactPreview(markdown, options);
  assert.doesNotMatch(html, /<script|<img src=x|href="(?:javascript|data|%6aavascript)|src="https:/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /src="diagram.png"/);
});

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'miw-preview-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory, dashboardPath: path.join(directory, 'status.html') };
}

test('rewrites every existing local Markdown link, preserving names and other links', async (t) => {
  const f = await fixture(t);
  const filename = 'miw-session פרטים & spec.md';
  await writeFile(path.join(f.directory, filename), example);
  const encoded = encodeURIComponent(filename);
  const input = `<a href="${encoded}" title="Spec">Spec</a><a href="${encoded}#decision-log">Audit</a><a href="missing.md">Missing</a><a href="data.json">Data</a><a href="https://example.com/spec.md">Remote</a>`;
  const html = await generateArtifactPreviews(input, f);
  assert.ok(html.includes(`href="${encoded}.preview.html" title="Spec" target="_blank" rel="noopener noreferrer"`));
  assert.ok(html.includes(`href="${encoded}.preview.html#decision-log"`));
  assert.match(html, /href="missing.md">Missing/);
  assert.match(html, /href="data.json">Data/);
  assert.match(html, /href="https:\/\/example.com\/spec.md">Remote/);
  const preview = await readFile(path.join(f.directory, `${filename}.preview.html`), 'utf8');
  assert.match(preview, /<th>Question<\/th>/);
  assert.equal(await readFile(path.join(f.directory, filename), 'utf8'), example);
  await writeFile(path.join(f.directory, filename), '# Updated document');
  await generateArtifactPreviews(input, f);
  assert.match(await readFile(path.join(f.directory, `${filename}.preview.html`), 'utf8'), /<h1 id="updated-document">/);
});

test('nested artifact previews resolve their original and dashboard links correctly', async (t) => {
  const f = await fixture(t);
  await mkdir(path.join(f.directory, 'reports'));
  await writeFile(path.join(f.directory, 'reports', 'review.md'), '# Review');
  const html = await generateArtifactPreviews('<a href="reports%2Freview.md">Review</a>', f);
  assert.match(html, /href="reports\/review.md.preview.html"/);
  const preview = await readFile(path.join(f.directory, 'reports', 'review.md.preview.html'), 'utf8');
  assert.match(preview, /href="review.md">Open original/);
  assert.match(preview, /href="..\/status.html">Back to dashboard/);
});

test('does not read outside the run or overwrite symlink preview targets', async (t) => {
  const f = await fixture(t);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'miw-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const source = path.join(outside, 'private.md');
  await writeFile(source, '# Private');
  await symlink(source, path.join(f.directory, 'linked.md'));
  await symlink(outside, path.join(f.directory, 'linked-directory'));
  const links = `<a href="${source}">Absolute</a><a href="${path.relative(f.directory, source)}">Outside</a><a href="linked.md">Symlink</a><a href="linked-directory/private.md">Directory</a>`;
  assert.equal(await generateArtifactPreviews(links, f), links);
  await writeFile(path.join(f.directory, 'spec.md'), '# Spec');
  await symlink(source, path.join(f.directory, 'spec.md.preview.html'));
  await assert.rejects(generateArtifactPreviews('<a href="spec.md">Spec</a>', f), /Not a regular file/);
  assert.equal(await readFile(source, 'utf8'), '# Private');
});

test('honors versioned miw artifact naming without duplicate prefixes', async (t) => {
  const f = await fixture(t);
  const directory = path.join(f.directory, 'make-it-work', 'session');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'miw-run.json'), '{"artifact_naming_version":1}');
  await writeFile(path.join(directory, 'miw-spec.md'), '# Versioned spec');
  const html = await generateArtifactPreviews('<a href="spec.md">Spec</a>', { dashboardPath: path.join(directory, 'miw-status.html') });
  assert.match(html, /href="miw-spec.md.preview.html"/);
  assert.match(await readFile(path.join(directory, 'miw-spec.md.preview.html'), 'utf8'), /href="miw-spec.md">Open original/);
  // Existing user-named sources retain their names even in a marked run;
  // derived files still follow the run's output naming rules.
  await writeFile(path.join(directory, 'custom.md'), '# Custom');
  const custom = await generateArtifactPreviews('<a href="custom.md">Custom</a>', { dashboardPath: path.join(directory, 'miw-status.html') });
  assert.match(custom, /href="miw-custom.md.preview.html"/);
  assert.match(await readFile(path.join(directory, 'miw-custom.md.preview.html'), 'utf8'), /href="custom.md">Open original/);
});
