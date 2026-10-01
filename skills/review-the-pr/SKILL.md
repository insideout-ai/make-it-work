---
description: "Reviews a pull request in three documentation-grounded passes (business correctness, regression safety, coding standards) and emits an evidence-dense, verdict-first report. Use when reviewing a PR or diff in any repo that keeps CLAUDE.md plus uc-*/domain-* skills and .claude/rules docs."
disable-model-invocation: true
---

# Review the PR

## Usage

```
/make-it-work:review-the-pr [--autopilot]
```

- **No argument** — interactive. Every checkpoint below pauses for a human, exactly as documented in Steps 0–1.
- **`--autopilot`** — unattended. At every interactive point below, apply the Autopilot Mode policy instead of pausing.

## Autopilot Mode

This skill uses no `AskUserQuestion` calls today — every interactive point is a plain-text prompt. Autopilot answers each one in place rather than introducing a tool call where none exists.

**Resolution table** (one row per interactive site, in the order they appear):

| Step | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| Step 0 | "ask the user for the pull-request link" | `open_text` | If the invocation already includes a PR link, use it (log it as already provided — this is not a guess). Otherwise resolve to the skill's own documented **"No PR yet"** branch: proceed without one, note it, and cite files by commit hash only. Never invent or look up a PR URL — Step 0's "never substitute your own guess" rule is about not picking *which* PR the user means among several candidates; it does not forbid this fixed, non-destructive fallback the skill already defines for "no PR yet." |
| Step 1 (Requirements) | "Is there a requirements file or ticket text I should review against?" | `open_text` | If requirements were already supplied in the invocation, use them (log as already provided). Otherwise answer "none provided" and let the skill's own documented fallback chain run unattended: attempt the ticket fetch (extract the ticket key from the branch name, fetch via whatever MCP issue-tracker tool is available in this environment); if that yields nothing, fall through to the branch-name/commit-message inference. Either way, the Coverage line's requirements-source field must say so, exactly as the interactive path already requires. |
| Step 1 (Base) | Source/destination branch confirmation | `checkpoint` | Auto-confirm a deterministic guess — current branch as source, the repo's default branch (`main`/`master`, or whatever `git branch -r`/PR metadata points to) as destination — exactly as if a human had accepted both suggested branches. Record the confirmed pair in the Coverage line as usual. |

**Hard-stop exception:** no destructive action is flagged for this skill — autopilot never deletes, force-pushes, or discards anything. One caveat worth naming rather than silently assuming away: a re-run for the same ticket overwrites `make-it-work/{TICKET}-review.md` from a prior run, in **both** interactive and autopilot mode — the interactive path has no overwrite prompt either (Step 7's Output format section just says "Save to..."). Autopilot therefore removes no human gate that existed before it. This file is a regenerable analysis artifact, not hand-curated source of truth (unlike, say, a plan file), so this is not treated as the hard-stop destructive-action exception — just documented here so it isn't mistaken for an oversight.

**Decision log:** write `.claude/review-the-pr-autopilot-log.jsonl` at repo root, overwritten fresh at the start of each autopilot run. One JSON object per line, same schema as the rest of this plugin's autopilot logs:
- `phase` — e.g. `"Step 0"`, `"Step 1"`.
- `site` — a short slug, e.g. `"pr-link"`, `"requirements-source"`, `"branch-pair"`.
- `kind` — `"open_text"` or `"checkpoint"` (this skill never reaches `"askUserQuestion"`).
- `chosen` — the free-text answer (`open_text`) or a short string describing what was confirmed (`checkpoint`).
- `rationale` — one sentence.

Log a line for every site above on every run, including a site skipped because its input was already supplied in the invocation — mark `chosen` accordingly (e.g. `"already provided in the invocation"`) so the log stays a complete, auditable record of the run rather than only the sites that needed a real decision.

At the end of an autopilot run, print a short human-readable summary of the three resolutions above and the log file's path, so someone can audit the run afterward.

## Overview

Review changes in three passes, grounded in **this repo's documentation** — never from generic intuition alone:

1. **Business correctness** — validate the changed logic against the end-to-end use-case flows (`uc-*` skills), the Domain Validation Rules in `.claude/rules/product.md`, and the ticket's stated scope.
2. **Regression safety** — cross-reference the touched components against the functional domains (`domain-*` skills), the Architectural Constraints in `.claude/rules/architecture.md`, and every *other* use case that flows through the same code.
3. **Coding standards** — the Guidelines section of `CLAUDE.md` (already in context).

A finding is reportable only if you can state a **concrete failure scenario** backed by evidence from the code (a specific input/state that produces a wrong output, a lost record, a wrong response sent to an external system, a misleading log). "This could be cleaner" is not a finding unless a `CLAUDE.md` guideline names it.

This is production code that moves real money or data on behalf of real customers. Review with that blast radius in mind.

## Step 0 — Ask for the PR link first

Before doing anything else — before fetching requirements, before running any git command — **ask the user for the pull-request link** unless the request already includes one. The PR link is the findings anchor: it pins the exact head commit and gives the output its Bitbucket/GitHub/GitLab source URL for inline citations. One question, then wait (autopilot: see Autopilot Mode):

> "Please share the PR link for this review (or tell me there's no PR yet)."

- **PR link provided** → extract the head commit hash and carry the link into the output. Branch verification happens in Step 1 regardless.
- **No PR yet** → note it; the output will link to files by commit hash only. Move to Step 1.
- Never substitute your own guess of "the PR they probably mean" for asking.

## Step 1 — Establish the diff

1. **Requirements** — the review's definition of *intended scope*, resolved in this order:
   1. **User-provided (preferred)**: the user may hand you the requirements directly — a pasted ticket description, a ticket key, or a path to a requirements/refined-ticket markdown file. If the request doesn't include one, ask once: "Is there a requirements file or ticket text I should review against?" — then proceed with whatever the answer is (autopilot: see Autopilot Mode).
   2. **Ticket fetch**: otherwise extract the ticket key from the branch name (e.g. `feature/TICKET-123-...` → `TICKET-123`) and fetch it using whatever MCP tool is available for this repo's issue tracker (Jira, Linear, GitHub Issues, etc.).
   3. **Fallback**: if neither is available, derive intent from the branch name and commit messages, and state in the output that scope was inferred, not confirmed.

   Whichever source is used, record it in the Coverage line. Scope-creep findings (Step 3) are only as strong as this source — with user-provided requirements they are authoritative; with inferred scope, phrase them as questions to the author rather than verdicts.

2. **Base — always verify the branch pair before diffing**: the review is only as valid as the source/destination pair it diffs; a wrong base reports other people's merged work as this PR's changes and buries the real diff. **Always ask** — even when a PR link is provided — before reading any code (autopilot: see Autopilot Mode):

   > **Source (origin) branch**: `<your best guess>` / other (type below)
   > **Destination branch**: `<your best guess>` / other (type below)

   Derive the best guess from the PR metadata, branch name, and `git branch -r` output. Wait for confirmation before running `git diff <base>...HEAD`.

3. **Read whole files, not hunks.** `git diff --name-only <base>...HEAD`, then read each changed file in full at the reviewed commit. Findings frequently live in *unchanged* sibling code — a neighboring method that guards a case the new code misses, an interface with two similar fields, a writer that already handles what the new code re-handles.

## Step 2 — Load the skills that match the diff

The `CLAUDE.md` skill-loading gate applies to reviews. Before judging any changed file, load **every** matching skill via the `Skill` tool.

**How to find matching skills:**

1. Open `CLAUDE.md` and locate the skill-loading gate section — it contains a mapping table of code areas → skills. Match each changed file path against that table and load every skill listed for it.
2. If `CLAUDE.md` has no explicit table, fall back to heuristics: any `uc-*` skill whose name matches the feature area touched, and any `domain-*` skill whose description covers the changed component.
3. **Enumerate every UC that flows through the changed code — don't stop at the one the ticket names.** For each `domain-*` skill you loaded, read its list of the `uc-*` skills that use that domain (each domain skill enumerates them), and load **every** UC on that list. Cross-check that list against the User Journey Chains in `product.md` and the Functional Domains table in `architecture.md` so no flow is missed. This is especially critical when the diff touches shared infrastructure (services, utilities, models, enums, factories used by several flows): each of those UCs is a regression candidate, and you cannot spot the regression in Step 4 without its skill loaded here.

**What each skill type provides:**

- `uc-*` skills → what the business flow must do; the Main/Alternative flows, invariants, and field mappings the changed code must preserve.
- `domain-*` skills → what architectural invariants must survive; the data contracts, status machine rules, and cross-cutting constraints the changed component owns.

## Step 3 — Business-correctness pass

For each loaded `uc-*` skill, walk the changed logic against the documented flow and ask:

- **Does the diff alter a documented behavior or validation rule** (product.md "Domain Validation Rules", the UC's Main/Alternative flows)? If the ticket doesn't explicitly mandate that change, it's a **Critical** finding — silent business changes are the most damaging class of bug here.
- **Paired logic stays paired**: decision methods and their reporting/reason methods must check the same fields; a check-side change without the report-side change (or vice versa) produces impossible or misleading states.
- **Field provenance**: is the *right* field used? Interfaces often carry near-duplicate fields (different IDs for the same concept, address fields, amount fields). Verify against the UC skill's documented mapping before assuming a rename or substitution is safe.
- **Scope**: anything in the diff the ticket doesn't ask for (new utilities, drive-by refactors) → flag under "Exact scope". Small and harmless → Minor; behavior-affecting → higher.

## Step 4 — Regression pass

**Hard architectural constraints** — open `architecture.md` and locate its "Architectural Constraints" section (or equivalent). Each constraint listed there is a **Critical** finding if violated. Read them now and check the diff against each one.

Then hunt for the quieter regressions:

- **Every UC through the changed code**: walk the change against *each* `uc-*` skill enumerated in Step 2 (the UCs the touched functional domains list as their users), not only the ticket's UC. For each one, trace its documented flow through the modified code and ask whether the new behavior still satisfies that UC's invariants and field mappings. A change that is correct for the ticket's flow routinely breaks a sibling flow that shares the same service, model, or factory — this cross-reference is where those regressions surface.
- **Callers**: for every modified function signature or behavior, grep all call sites — do they all tolerate the change?
- **Single-row DB reads**: any query feeding one record (`result[0]`) needs a soft-delete filter and a deterministic `ORDER BY ... LIMIT 1`. Compare with sibling queries in the same file — the codebase usually has a correctly-guarded sibling to point at.
- **Source migrations**: when a diff changes where a value comes from (one field/table/config → another), the new source's empty/null/format space is different from the old one's. Trace **every downstream consumer** of the migrated value and check what happens when the new source yields empty, null, or absent — especially sentinel helpers whose behavior flips between `""` and `null`. A value the old source guaranteed non-empty may now arrive empty and silently flip a business decision.
- **Cache keys and scoping**: cached lookups must be keyed by everything that varies the result.
- **Tests**: new logic branches without unit tests, and tests deleted alongside behavior that still exists.
- **Off-checklist hunt**: the checks above are a floor, not a ceiling. After completing them, re-read the diff once more asking only *"what else goes wrong for real inputs?"* — new utilities and helpers deserve the same scrutiny as the flows that call them. Findings from this pass meet the same evidence bar as everything else.

## Step 5 — Coding-standards pass

`CLAUDE.md` (already in context) is the primary source of truth for this repo's conventions — apply what **it** states, not a remembered checklist from any other project. Also check the Claude rule files it references (e.g. under `.claude/rules/`), since standards often live there too, not only in `CLAUDE.md`. Read `CLAUDE.md` and those rule files, and turn each stated convention into a concrete check against the diff.

To make sure nothing is skipped, walk `CLAUDE.md` section by section rather than from memory. A standards doc commonly defines rules in categories such as: general engineering principles (scope discipline, DRY/KISS, readability), naming conventions, logging/observability, type safety, error handling, architectural layering, configuration/secrets, security, and testing. For **every such category your `CLAUDE.md` actually defines**, check the diff against the specific rule it gives — and ignore any category it doesn't mention. If `CLAUDE.md` names a rule this list doesn't, it still applies; if this list names one `CLAUDE.md` omits, drop it.

Severity follows the same calibration as everywhere else: a violation that changes behavior or hides a defect ranks higher than cosmetic hygiene (naming, missing explicit types, import order), which is Minor unless it demonstrably conceals a bug in this diff.

**Unresolved `plan-the-work` stub check.** If this repo uses `make-it-work`'s TDD verification pipeline (`plan-the-work` writes per-step test files, including stub signatures for not-yet-implemented code), grep the diff for the fixed marker `plan-the-work stub — pending implementation`. Any match reaching this PR is, by definition, an unfinished step that never got real implementation — flag it as a **Critical** finding naming the exact file/line, regardless of what other category it might also fall under: a stub reaching review means the branch was merged (or is being reviewed for merge) before `execute` finished the plan it came from.

## Step 6 — Docs-sync check

`CLAUDE.md`'s "After Any Feature Change" section (or equivalent) makes skill/doc updates part of the change itself — review them like code:

- **Changed behavior in an existing flow or domain** → the matching `uc-*` / `domain-*` skill file must be updated **in this same diff**. Missing update → **Major** finding naming the exact skill file and what it should now say.
- **New end-to-end flow** (new route + service + data path) → a new `uc-*` skill must exist and be registered in `CLAUDE.md`'s UC table and `product.md`'s UC summary. **New service/provider/route/domain** → `architecture.md`'s tables updated.
- **Included updates are content, not checkbox**: when the diff does update a skill file, verify the new text actually matches the code change — a skill updated to describe behavior the code doesn't implement (or vice versa) is worse than no update. Flag mismatches at the severity of the confusion they will cause.
- **Pure refactors/bugfixes that change no documented behavior** need no doc update — don't flag noise.

Record the outcome in the Coverage line (`docs-sync: uc-02, uc-05 updated ✓` / `docs-sync gap: uc-05 not updated for sourcing change`).

## Step 7 — Verify, then report

Adversarially re-check every candidate finding before writing it down:

1. Re-read the exact code at the reviewed commit — does the failure scenario actually occur?
2. Is it introduced by this diff, or pre-existing? (`git blame` / diff base when unsure.) Pre-existing issues go in a short separate note, never in the numbered findings.
3. Do the file/line references match the reviewed commit?

Drop anything that fails these checks. A short list of confirmed findings is worth more than a long list of maybes — every false positive costs the reviewer's trust.

## Output format

Deliver the review in **two tiers** — a durable, pasteable report in a file, and a scannable summary in chat. Both lead with a verdict so the reader knows the outcome before reading a single finding.

### Tier 1 — Full report (file)

Save to `make-it-work/{TICKET}-review.md` (create the `make-it-work/` folder at the repo root if it doesn't exist), or to the path the user specifies. PR-comment style — verdict first, then findings, no checklist boilerplate:

```markdown
### Code review — {TICKET} (<branch>, <reviewed commit short-hash>)

**Verdict:** <Approve | Approve with nits | Request changes> — <N Critical, N Major, N Minor>
**Solid:** <one line on what the change does well — omit if nothing noteworthy, never pad>

Found N issues:

1. **[Critical]** <one-line claim>. <Evidence-dense paragraph: what the code does,
   the concrete input/state → wrong outcome, comparison to the sibling/guarded code
   if one exists, and the specific fix.>
   `path/to/file.ts:123` — <skill/rule violated, e.g. uc-02 / architecture.md constraint / CLAUDE.md logging>

2. **[Major]** ...

**Pre-existing (not blocking)**: <only if something severe was noticed in unmodified code>

**Coverage**: diffed `<base>...<head>`; skills consulted: <uc-/domain- list>; requirements source: <user-provided file/text | ticket TICKET-123 | inferred from branch and commits>; docs-sync: <updated skills verified | gaps flagged | not applicable>.
```

When the reviewed commit hash is known, link each finding to the source file at that commit using the repo's hosting URL (e.g. `https://github.com/org/repo/blob/<commit>/path/file.ts#L123` or the equivalent for Bitbucket/GitLab).

### Tier 2 — Chat summary

Print a compact, scannable version in chat — the verdict, one line per finding (severity + claim + `file:line`), and a pointer to the full report. No evidence paragraphs; the reader opens the file for those.

```
Verdict: Request changes (1 Critical, 2 Major)
1. [Critical] <one-line claim of the defect> — <file>:<line>
2. [Major]    <one-line claim of the defect> — <file>:<line>
3. [Major]    <one-line claim of the defect> — <file>:<line>
→ full report: make-it-work/{TICKET}-review.md
```

When there are **no findings**, say so plainly in both tiers — `Verdict: Approve — no issues found` plus the Coverage line — and don't invent filler.

**Severity**:
- **Critical** — must fix before merge: wrong data sent to an external system, undocumented business-rule change, state-machine/constraint violation, security/PCI exposure. Critical requires that the impact *matters to the business* per product.md, the UC skills, or the requirements. When the impact hinges on a business tolerance documented nowhere, report it as a **question to the author** with a provisional severity — not a Critical verdict.
- **Major** — should fix: real defect with a narrower blast radius, misleading logs/reasons/rejection reasons, lint suppressions, missing tests for new logic branches, unrelated changes that alter behavior.
- **Minor** — polish: type hygiene (`any`, missing explicit types) unless it demonstrably hides a defect in this diff, typos in messages, log-format inconsistencies, import order, DRY suggestions.

**Causal-chain citation**: when a finding's impact runs through *unchanged* code — an exception caught by a generic handler, a downstream consumer, a shared utility — cite the whole chain, not just the diff line: the changed line that introduces the behavior AND the unchanged handler/consumer where the consequence materializes (`file:line` for each). The author must be able to verify the claim without re-tracing it.

**Do not flag**: pre-existing issues (separate note only), formatting the linter will fix automatically, intentional pattern-breaking in test mocks/stubs, style preferences no `CLAUDE.md` rule names, optimizations without a measured need.

## When run by implement

This section applies only when `/make-it-work:implement` dispatches the review; a standalone review ignores it entirely and runs every step above as written.

**Inputs** — the dispatch prompt provides: the ticket key, the spec path, the current plan path, the base branch, the literal `no PR`, the review cycle number, the list of known unrelated regressions (may be empty), and the list of decided findings (may be empty).

**Skipped prompts** — do not run Step 0 (PR link), and skip Step 1's requirements question and its branch-pair confirmation. The requirements source is the provided spec plus plan, treated as authoritative exactly like user-provided requirements in Step 1.

**Diff to review** — the work is not committed and there is no PR, so review the working tree against the base:

- Tracked changes: `git diff $(git merge-base <base> HEAD)` — this covers committed and uncommitted work together.
- Untracked new files: `git ls-files --others --exclude-standard -- . ':!make-it-work'` — read each one in full.
- Exclude `make-it-work/` from everything above.
- In the report header, label the reviewed commit as `working tree on <HEAD short-hash>`, and omit hosted-source links.

**Unchanged steps** — Steps 2–5 and Step 7 apply as written, including Step 5's unresolved-stub check.

**Docs-sync override (Step 6)** — `implement` updates skills and rules files in its own final context sync, after review. A missing or stale `uc-*`, `domain-*`, or rules-file update is therefore **not** a finding here: list each one under a `**Context gaps (for final sync):**` block in the report instead. A skill or rules update that *is* in the diff but contradicts the code is still a finding.

**Known unrelated regressions** — list the ones `implement` passed in under a `**Known unrelated regressions (documented, out of scope):**` block, not as findings — unless the diff demonstrably caused one, in which case report it as a normal finding with that evidence.

**Decided findings** — a `Route: human` question the user has already decided in an earlier cycle (passed in by `implement`) is settled: do not raise it again unless the diff has since changed the code it concerns. List each one under a `**Decided (not re-raised):**` block in the report.

**Finding routes** — tag every numbered finding with exactly one route:

- `Route: fix` — fixable within the current approach (includes an unresolved `plan-the-work` stub).
- `Route: replan` — the approach itself, or an assumption the plan relies on, is wrong.
- `Route: human` — needs a product, business, or architectural decision no document settles (the "question to the author" cases above).

**Outcome line** — end both the Tier 1 report and the Tier 2 chat summary with exactly one line:

```
Orchestrator outcome: CLEAN | FIX_REQUIRED | REPLAN_REQUIRED | HUMAN_DECISION
```

- Verdict **Approve** or **Approve with nits** → `CLEAN`.
- Verdict **Request changes** → `REPLAN_REQUIRED` if any finding is `Route: replan`; otherwise `HUMAN_DECISION` if any is `Route: human`; otherwise `FIX_REQUIRED`.

**No questions** — never ask the user anything in this mode. Anything that would need a question becomes a `Route: human` finding.
