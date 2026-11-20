import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function seedVisualFixture(root, variant) {
  if (!['flow', 'simple', 'amend'].includes(variant)) throw new Error('Unknown visual fixture.');
  const put = async (file, text) => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), text);
  };
  await cp(new URL('happy-path/fixture/', import.meta.url), root, { recursive: true });
  await put('.gitignore', 'make-it-work/\n');
  await put('CLAUDE.md', '# Task service\nSingle repository. No configured test runner; use concrete manual verification. Planning must not change source, tests, this guidance or the accepted spec. No external services or dependency installation.\n');
  const spec = variant === 'simple'
    ? '# VIS-1 — clarify the README title\n\n## Acceptance Criteria\nChange only the README heading from demo-tasks to Demo task service. Preserve all other README content and runtime behavior.\n'
    : '# VIS-1 — suppress muted reminders\n\n## Acceptance Criteria\nOnly an open overdue task whose owner has not muted reminders can notify. A muted owner must receive no notification and sendReminder must return false. Existing unmuted overdue delivery and non-overdue suppression remain unchanged. The mute flag is task.ownerMuted === true. Read it directly before sending; keep the synchronous API and existing return values.\n\n## Out of scope\nEvents, asynchronous delivery, storage changes, UI and completing tasks.\n';
  await put('make-it-work/VIS-1/VIS-1-spec.md', spec);
  await put('.eval-spec.md', spec);
  const source = 'src/notifications/sendReminder.js';
  await put('.eval-reminder.js', await readFile(path.join(root, source), 'utf8'));
  await put('.eval-readme.md', await readFile(path.join(root, 'README.md'), 'utf8'));
  if (variant === 'amend') {
    const step = '### Step 1 — Preserve reminder behavior\n\n- **Files:** `src/notifications/sendReminder.js`\n- **Depends on:** none\n- **Can run in parallel with:** none\n\n**What to do:** Retain the overdue check and synchronous notification return values.\n\n**Verify:** An unmuted open overdue task sends once and returns true; a future task sends nothing and returns false.\n\n**Tests:** Exempt — no configured test runner; manual verification below.\n';
    const sections = {
      'What This Changes': 'Reminders keep their current overdue behavior. Owner muting still needs the review fix below.',
      'Visual Overview': 'Existing delivery path; review has identified a missing owner preference check.\n\n```mermaid\nflowchart LR\n  A["Open overdue task"] --> B["Send reminder"]\n```',
      'Execution Status': '**Mode:** Inline\n\n**Progress:** Step 1 of 1 complete.',
      'Open Questions & Blockers': 'None',
      'Decision Log': 'None',
      Goal: 'Honor owner muting while preserving existing reminder behavior. See `make-it-work/VIS-1/VIS-1-spec.md`.',
      'Requirement Summary': 'Business goal: respect owner preferences. In scope: reminder suppression. Out of scope: events and asynchronous delivery. Assumptions: none.',
      Approach: 'Use direct task-field checks before sending a synchronous notification.',
      'Affected Code': '### `demo-tasks`\n\n| File | Change | Summary |\n| --- | --- | --- |\n| `src/notifications/sendReminder.js` | Modify | Respect owner preferences |',
      'Domains/UCs Touched': '`demo-tasks`: None — no domain skills.',
      'Codebase Gaps': 'Owner muting is not checked yet.',
      'Verification Policy': 'None',
      Risks: 'None\n\n**Overall risk (before mitigations):** Low\n**Overall risk (after mitigations):** Low',
      'Pre-flight': 'Existing source is the accepted baseline. Planning changes artifacts only.',
      Steps: step,
      'Test Plan': '| Scenario | Type | File / command |\n| --- | --- | --- |\n| Existing delivery | Manual | Step 1: pass an open overdue task and notifier spy; expect one send and true. |\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| Existing delivery stays unchanged | Existing delivery |',
      'Definition of Done': 'All planned checks observed and accepted requirements covered.',
    };
    const plan = '# Plan for VIS-1 — owner reminder preferences\n\n**Test preparation contract:** 1\n\n' + Object.entries(sections).map(([title, body]) => `## ${title}\n\n${body}\n`).join('\n');
    await put('make-it-work/VIS-1/VIS-1-plan.md', plan);
    await put('.eval-original-plan.md', plan);
    await put('docs/review.md', '# Review\n\n#1 — Route: fix. The completed step still sends reminders to muted owners. Add the ownerMuted guard before notification, cover muted/unmuted/future task cases, and correct the Visual Overview so it depicts the fixed behavior. The accepted spec already requires this.\n');
  }
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.name', 'fixture');
  git('config', 'user.email', 'fixture@example.com');
  git('checkout', '-q', '-b', 'feature/VIS-1-reminders');
  git('add', '.');
  git('commit', '-q', '-m', 'Seed planning visual fixture');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // The shell guard runs before this entrypoint; refuse accidental direct seeding too.
  const root = process.cwd();
  if (!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(root)) throw new Error('Use a disposable temporary directory.');
  try { execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' }); throw new Error('Refusing an existing repository.'); }
  catch (error) { if (!error.status) throw error; }
  await seedVisualFixture(root, process.argv[2]);
}
