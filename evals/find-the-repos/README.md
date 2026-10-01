# `find-the-repos` smoke test

Four cases exercising `skills/find-the-repos/SKILL.md`. `find-the-repos` has no `--autopilot` flag
and is not part of the `close-the-gaps → plan-the-work → execute → review-the-pr` pipeline, so this
suite is simpler than the autopilot-rollout suites elsewhere in this tree: no `.claude/`-write
exposure, no autopilot decision log, and no need for Bash or `--dangerously-skip-permissions` —
all four cases run fully through plain `claude plugin eval`.

- **`happy-path`** — a documented multi-repo workspace (root `CLAUDE.md` naming six sibling repos).
  Exercises Phase 3's full matching logic in one pass: a Definite match, a Possible (topical-only)
  match, a repo excluded for having no `product.md`, a repo named in the workspace file but missing
  on disk, and the two subtle false-positive traps Phase 3 calls out explicitly — a repo whose own
  `product.md` only documents a cross-repo relationship to the matching repo (must not count as its
  own match), and a repo connected upstream to the matching repo only in the *workspace file* (must
  not be added by that ripple effect alone). Also serves as the negative control for the
  purely-technical fallback (asserts it does *not* fire here).
- **`technical-fallback`** — a CVE/dependency-upgrade ticket with no business-logic content, across
  two repos whose `architecture.md` tech-stack tables differ only in which logging library they use.
  Exercises the explicit purely-technical statement and the `architecture.md`-based (not
  `product.md`-based) shortlist it produces instead.
- **`single-repo-refusal`** — a single, ordinary git repo with no parent-level workspace-root
  orientation file. Exercises the one named divergence from `plan-the-work`'s Step 1a: a single repo
  with nothing to shortlist against must refuse, not trivially "match" the one repo it's sitting in.
- **`unrelated-clones`** — two sibling repos, each with their own `.git`, but no workspace-root
  orientation file tying them together. Exercises the "ask the user which repo(s) to check" branch,
  distinct from both the refusal above and the happy-path's confirmed shortlist.

All four pause at a checkpoint before writing anything under `make-it-work/` — `happy-path` and
`technical-fallback` at Phase 4's shortlist confirmation, `single-repo-refusal` and
`unrelated-clones` even earlier, in Phase 1. None of them ever reach `make-it-work/<TICKET>-repos.md`
in a one-shot headless run; every case has a `file_exists`/`exists: false` grader confirming that
file is never written before a human has had the chance to confirm or adjust the draft.

## Running everything

```
bash evals/find-the-repos/run-all.sh
```

## Case-by-case notes

### `happy-path`

Fixture: a workspace root (no `.git` of its own) with a `CLAUDE.md` naming six sibling repos, and a
`SNOOZE-100-spec.md` ticket about letting a user snooze an overdue task reminder:

- `notifications-service` — `product.md` has an exact "Snooze Reminder" use case → **Definite**.
- `tasks-api` — `product.md` only shares the "overdue" concept, no snooze use case → **Possible**.
- `billing-service` — git repo, no `.claude/rules/product.md` at all → excluded, flagged.
- `archive-service` — named in `CLAUDE.md`, no directory on disk → flagged, not silently dropped.
- `analytics-service` — `product.md`'s only mention of the ticket's concept is a note that it
  *ingests* `reminder.snoozed` events from `notifications-service` — a cross-repo relationship note
  about itself, not a use case it owns (skill line 73's exact test case). Must not match.
- `legacy-worker` — unrelated `product.md` content; `CLAUDE.md` separately notes it's connected
  upstream to `notifications-service`. Must not match just from that workspace-file-level ripple
  effect (skill line 72's exact test case).

Graders: `notifications-service` reported Definite with real reasoning; `tasks-api` reported
Possible with topical-only reasoning; both `billing-service` and `archive-service` explicitly
flagged; `analytics-service` and `legacy-worker` each confirmed absent from both match tiers; the
"purely technical" fallback phrase never appears; `make-it-work/SNOOZE-100-repos.md` does not
exist; the final message reads as a genuine, unanswered confirmation checkpoint.

**Verified for real**, via plain `claude plugin eval` (no Bash granted, `--judge-model sonnet`), 10
turns, all 8 graders passed. Read the full final message — it correctly classified every one of the
six repos, including both subtlety traps, entirely via `Read`/`Glob` (no `pwd`, no `Bash` needed):

> **Definite Matches** — notifications-service (UC-02 "Snooze Reminder" ... exact match) ...
> **Possible Matches** — tasks-api (owns "overdue" ... but doesn't map to any of its own use cases,
> just topical overlap) ...
> **Excluded / Flagged** — billing-service (no product.md) ... archive-service (named ... but not
> checked out) ...
> Not shown as matches (product.md exists but no overlap, so simply omitted per the skill's rules):
> analytics-service (... a documented upstream-consumer relationship, not a use case it owns
> itself) ... legacy-worker (... unrelated to reminder snoozing) ...
> Does this shortlist look right to you, or would you like to adjust it ... before I save it?

### `technical-fallback`

Fixture: two repos (`payments-api`, `notifications-service`) with ordinary, unrelated `product.md`
content, but `architecture.md` tech-stack tables naming different logging libraries (`winston v2.x`
vs. `pino v8.x`). Ticket: upgrade `winston` to patch a CVE — purely technical, no business-logic
content any `product.md` could plausibly match.

Graders: the purely-technical framing and the architecture.md-based-fallback statement are both
present; `payments-api` reported as a match with reasoning naming its `winston` dependency;
`notifications-service` confirmed absent from the match list; `make-it-work/CVE-UPGRADE-200-repos.md`
does not exist.

**Verified for real**, via plain `claude plugin eval`, 12 turns, all 4 graders passed. Final message
correctly opened with the purely-technical note, matched `payments-api` on its `winston v2.x` line,
and called out `notifications-service`'s `pino` stack as the reason it wasn't included.

### `single-repo-refusal`

Fixture: a single git repo (`.git` at the fixture root, committed via `fixture.sh`) with a
`product.md` and a ticket, but no parent-level workspace-root orientation file — deliberately
re-derived from `plan-the-work`'s Step 1a layout, which that skill treats as an ordinary
single-repo project and proceeds on. `find-the-repos` must do the opposite.

Graders: the message clearly refuses ("nothing to shortlist") before Phase 2; no `Definite Match`
heading ever appears; `make-it-work/TICKET-900-repos.md` does not exist.

**Verified for real**, via plain `claude plugin eval`, 5 turns, all 3 graders passed. Final message:
"Phase 1 result: ... is a git repo (project root), and its parent ... has no workspace-root
orientation file ... Per this skill's rules, a single repo with no workspace-root orientation file
tying it to siblings has nothing to shortlist between ... **There is nothing to shortlist here —
stopping before Phase 2.**"

### `unrelated-clones`

Fixture: a workspace root with no `.git` of its own and no `CLAUDE.md`, holding two sibling repos
(`repo-alpha`, `repo-beta`) each with their own `.git` — clones with no unifying documentation.

Graders: the message asks which repo(s) to check, naming both candidates, rather than guessing; no
`Definite Match` heading appears; `make-it-work/TICKET-910-repos.md` does not exist.

**Verified for real**, via plain `claude plugin eval`, 11 turns, all 3 graders passed. Final
message: "I found two repos (`repo-alpha`, `repo-beta`) as sibling clones ... but there's no
workspace-root orientation file ... tying them together ... Which repo(s) would you like me to
check against `TICKET-910-spec.md` — `repo-alpha`, `repo-beta`, or both?"

## Known gaps in this suite (by design, not oversight)

- Doesn't cover Phase 1 case 1's *positive* branch — being launched from inside one service
  repo whose **parent** holds the workspace-root orientation file. A `claude plugin eval` scaffold
  can only seed content into its own sandboxed cwd, not into that cwd's parent, so this exact layout
  can't be fixtured through `--scaffold`. It would need a manual, non-sandboxed run (a `mktemp -d`
  workspace root with the orientation file, a service repo one level in, invoked from inside that
  service repo) — not added here given the other three Phase 1 branches are already covered and
  this one shares the same matching logic once the workspace root is resolved either way.
- Doesn't cover a repo named in the workspace file whose directory exists but has an empty or
  malformed `product.md` — only the "no `product.md` at all" and "not on disk at all" exclusion
  reasons are exercised.
- Doesn't cover the user adjusting the draft shortlist before confirming (adding/removing a repo at
  Phase 4) — only that the confirmation checkpoint itself is genuinely reached and nothing is
  auto-saved past it.
- Doesn't cover the actual post-confirmation save (`make-it-work/<TICKET>-repos.md`'s file content
  and shape) at all, since no case here ever supplies the human confirmation a one-shot headless run
  stops short of. A manual, interactive run (or a scripted follow-up turn answering "yes, save it")
  would be needed to verify the save step itself — not attempted here, mirroring how this suite
  otherwise stays entirely within `claude plugin eval`'s single-turn-to-checkpoint model.
