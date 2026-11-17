import path from 'node:path';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { Marked } from '../vendor/marked/marked.mjs';
import { artifactPath } from './artifact-path.mjs';
import { atomicWrite } from './artifacts.mjs';
import { escapeHtml as escape } from './workflow-dashboard.mjs';

const encodePath = (value) => value.split(path.sep).map(encodeURIComponent).join('/');
const unescape = (value) => value.replace(/&(amp|quot|#39|lt|gt);/g, (_, entity) => ({ amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' })[entity]);
const inside = (base, file) => { const relative = path.relative(base, file); return relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative); };

// Allow ordinary document navigation, never executable or data URLs. Decode
// entities before checking: Markdown can spell javascript: as javascript&#58;.
function safeUrl(value, image = false) {
  let check = value.replace(/&#(x[0-9a-f]+|[0-9]+);?/gi, (_, code) => {
    const number = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return number <= 0x10ffff ? String.fromCodePoint(number) : '';
  }).replace(/&colon;?/gi, ':').replace(/&(?:tab|newline);?/gi, '').replace(/[\s\u0000-\u001f\u007f]/g, '');
  try { check = decodeURIComponent(check).replace(/[\s\u0000-\u001f\u007f]/g, ''); } catch { return null; }
  if (check.startsWith('//') || check.includes('\\')) return null;
  const scheme = check.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && !(image ? [] : ['https', 'http', 'mailto']).includes(scheme)) return null;
  // Remote images use alt text instead: previews remain offline and do not make
  // network requests just because a document mentions an external image.
  if (image && (scheme || check.startsWith('/'))) return null;
  return value;
}

export function renderArtifactPreview(markdown, { filename, dashboardHref, originalHref }) {
  const slugs = new Map();
  const parser = new Marked({ gfm: true, renderer: {
    html({ text }) { return escape(text); },
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const base = text.replace(/<[^>]*>/g, '').toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').trim().replace(/\s/g, '-') || 'section';
      const count = slugs.get(base) ?? 0;
      slugs.set(base, count + 1);
      return `<h${depth} id="${escape(base + (count ? `-${count}` : ''))}">${text}</h${depth}>\n`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const url = safeUrl(href);
      return url === null ? text : `<a href="${escape(url)}"${title ? ` title="${escape(title)}"` : ''}>${text}</a>`;
    },
    image({ href, title, text }) {
      const url = safeUrl(href, true);
      return url === null ? escape(text) : `<img src="${escape(url)}" alt="${escape(text)}"${title ? ` title="${escape(title)}"` : ''} loading="lazy">`;
    },
    table(token) { return `<div class="table-scroll" role="region" aria-label="Document table" tabindex="0">${this.constructor.prototype.table.call(this, token)}</div>`; },
  } });
  const content = parser.parse(markdown);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src file: 'self'; base-uri 'none'; form-action 'none'">
<title>${escape(filename)} — Make-It-Work</title>
<style>
  :root { color-scheme: light; --ink: #1a1a1a; --muted: #596773; --blue: #096bae; --line: #dce3e9; --paper: #fff; --canvas: #f3f6f9; }
  * { box-sizing: border-box; }
  body { margin: 0; color: var(--ink); background: var(--canvas); font: 17px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  a { color: var(--blue); text-underline-offset: .18em; }
  a:hover { text-decoration-thickness: 2px; }
  :focus-visible { outline: 2px solid var(--blue); outline-offset: 4px; }
  .reader-nav { max-width: 1040px; margin: auto; padding: 22px 32px; display: flex; align-items: center; flex-wrap: wrap; gap: 12px 24px; font-size: 14px; }
  .reader-nav .filename { flex: 1; color: var(--muted); overflow-wrap: anywhere; min-width: 140px; }
  main { max-width: 1040px; margin: 0 auto 48px; padding: 48px 64px 64px; background: var(--paper); border: 1px solid var(--line); border-top: 3px solid var(--blue); border-radius: 4px; }
  article { max-width: 76ch; margin: auto; overflow-wrap: anywhere; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.25; scroll-margin-top: 24px; }
  h1 { font-size: 2.05rem; letter-spacing: -.025em; margin: 0 0 1.5rem; }
  h2 { font-size: 1.4rem; margin: 2.5rem 0 1rem; padding-bottom: .5rem; border-bottom: 1px solid var(--line); }
  h3 { font-size: 1.1rem; margin-top: 2rem; }
  p, ul, ol, blockquote { margin: 1rem 0; }
  li + li { margin-top: .35rem; }
  li > p { margin: .5rem 0; }
  code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; font-size: .86em; background: #edf2f7; padding: .15em .35em; border-radius: 3px; }
  pre { margin: 1.5rem 0; padding: 20px 24px; background: #f3f6f9; border: 1px solid var(--line); border-radius: 4px; white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 4; }
  pre code { padding: 0; background: transparent; border-radius: 0; }
  .table-scroll { overflow-x: auto; margin: 1.5rem 0; }
  table { width: 100%; border-collapse: collapse; font-size: .9rem; line-height: 1.5; }
  th, td { text-align: left; padding: 12px 16px; border: 1px solid var(--line); vertical-align: top; min-width: 100px; }
  th { background: #edf2f7; font-weight: 600; }
  tr:nth-child(even) td { background: #f8fafc; }
  blockquote { border-left: 3px solid var(--blue); padding: .1rem 1.25rem; color: var(--muted); margin-left: 0; }
  img { max-width: 100%; height: auto; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 2rem 0; }
  input[type="checkbox"] { accent-color: var(--blue); }
  @media (max-width: 640px) { body { font-size: 16px; } .reader-nav { padding: 18px 20px; } .filename { order: 3; flex-basis: 100% !important; } main { border-left: 0; border-right: 0; border-radius: 0; padding: 30px 20px 44px; } h1 { font-size: 1.65rem; } pre { padding: 14px; } th, td { padding: 10px; } }
  @media print { body { background: white; } .reader-nav { display: none; } main { max-width: none; margin: 0; border: 0; padding: 0; } article { max-width: none; } pre, tr { break-inside: avoid; } }
</style>
</head>
<body>
<nav class="reader-nav" aria-label="Artifact navigation"><a href="${escape(dashboardHref)}">Back to dashboard</a><span class="filename">${escape(filename)}</span><a href="${escape(originalHref)}">Open original</a></nav>
<main><article>${content}</article></main>
</body>
</html>\n`;
}

// Work on the finished dashboard so every Markdown link is covered, including
// audit and feedback links and links rewritten for versioned artifact naming.
export async function generateArtifactPreviews(html, { dashboardPath }) {
  const directory = path.dirname(dashboardPath);
  const base = await realpath(directory);
  const previews = new Map();
  const matches = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)];
  for (const match of matches) {
    if (previews.has(match[1])) continue;
    let href;
    try { href = decodeURIComponent(unescape(match[1])); } catch { continue; }
    const [relative, fragment = ''] = href.split('#');
    if (!/\.md$/i.test(relative) || /^[a-z][a-z0-9+.-]*:|^[\/\\]/i.test(relative) || relative.includes('\\')) continue;
    const source = path.resolve(artifactPath(path.resolve(directory, relative)));
    if (!inside(path.resolve(directory), source)) continue;
    try {
      if (!(await lstat(source)).isFile() || !inside(base, await realpath(source))) continue;
      const previewPath = artifactPath(`${source}.preview.html`);
      const markdown = await readFile(source, 'utf8');
      await atomicWrite(previewPath, renderArtifactPreview(markdown, {
        filename: path.basename(source), originalHref: encodePath(path.basename(source)),
        dashboardHref: encodePath(path.relative(path.dirname(source), dashboardPath)),
      }));
      previews.set(match[1], encodePath(path.relative(directory, previewPath)) + (fragment ? `#${encodeURIComponent(fragment)}` : ''));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return html.replace(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g, (tag, href) => {
    if (!previews.has(href)) return tag;
    return tag.replace(`href="${href}"`, `href="${escape(previews.get(href))}"`)
      .replace(/\s(?:target|rel)="[^"]*"/g, '').replace(/>$/, ' target="_blank" rel="noopener noreferrer">');
  });
}
