# Autopilot decision-log schema

Shared reference for the `**Decision log:**` section every `--autopilot`-enabled skill documents in its own `SKILL.md`. Each skill's own section states its own log filename and write-timing behavior (these differ per skill and stay there), then points here for the field shape, naming only its own deltas from the general shape below.

## Shared writer

When Bash is already permitted for the run, use the shared writer instead of
hand-building JSONL or editing existing lines. Invoke each writer command in
its **own Bash tool call**, never joined with discovery, tests, or another
file write: a denied `.claude/` operation must not prevent unrelated work in
the same shell call. Resolve `<base>` to the active
skill's directory and `<repo-root>` to the repo that owns the log:

```sh
node "<base>/../../scripts/decision-log.mjs" init <skill-name> --root "<repo-root>"
node "<base>/../../scripts/decision-log.mjs" append <skill-name> --root "<repo-root>" <<'JSON'
{"phase":"Phase 0","site":"mode-choice","kind":"askUserQuestion","question":"Which mode?","options":["Subagent-Driven (Recommended)","Inline"],"multiSelect":false,"chosen":"Subagent-Driven (Recommended)","rationale":"Autopilot picks the recommended option."}
JSON
```

`init` creates an empty log for a new run. `append` accepts one decision object
on stdin and requires that this run has already initialized the log. `write`
accepts one object or an array on stdin and atomically replaces the whole log;
use it for a skill that flushes decisions only after saving its deliverable, or
for `execute`'s first resolved site before later `append` calls. `write` with
`[]` creates the required empty log for a run with no resolved sites. The
writer validates the schema, serializes one JSON object per line, preserves
an existing log on malformed input, and rejects symlinked `.claude` paths.
It does not infer a choice: the skill still constructs and selects each
decision according to its own resolution table.

This command does **not** bypass tool permissions. If Bash is unavailable,
the skill may use its existing Write/Edit path for the same JSONL contract;
do not request broader permissions solely to produce this log. If a write to
the protected `.claude/` path is denied, do not retry through another tool or
path. A denied log write says nothing about whether a later, unrelated Bash
call (such as a test command) is allowed. Follow that skill's existing
denied-log handling and continue or stop exactly as its own instructions
require. Each skill's existing write timing
(start-of-run, first resolved site, or post-deliverable) remains authoritative.

## Core fields (every skill, every line)

- `phase` — the skill's own phase/step label for where this site lives, e.g. `"Phase 1"`, `"Step 4"`.
- `site` — a short slug identifying the specific site, e.g. `"wave-1-q2"`, `"mode-choice"`.
- `kind` — which of this skill's own interactive-site kinds fired: `"askUserQuestion"` (a real question/options payload was constructed), `"checkpoint"` (a plain-text pause point was auto-confirmed or auto-stopped), or `"open_text"` (a non-enumerable question was self-answered). Not every skill exercises all three — each skill's own Decision log section states which subset of this enum applies to it.
- `chosen` — the resolved value, in whichever of these shapes the site's `kind` (and, for `askUserQuestion`, `multiSelect`) produces:
  - a string (the chosen option's label), for a single-select `askUserQuestion` or a `checkpoint`,
  - an array of strings, for an `askUserQuestion` with `multiSelect: true`,
  - the free-text answer, for `open_text`,
  - or `null`, for a site that stopped rather than resolving (the standard convention for a fired hard-stop, across every skill that can hard-stop).

  A skill that never reaches one of these kinds (e.g. never has `open_text`, or never hard-stops) simply never produces that branch — its own Decision log section says which branches actually apply.
- `rationale` — one sentence.

## Conditional fields (only when `kind` is `"askUserQuestion"`)

- `multiSelect` — boolean. Present only on a skill that actually presents `askUserQuestion` sites. A skill whose every `askUserQuestion` site is single-select may still carry this field (always `false`) or omit it entirely as a fixed, always-`false` fact — its own Decision log section says which.
- `question`, `options` — the exact constructed payload.

A skill that never reaches `"askUserQuestion"` at all omits all three of `multiSelect`, `question`, and `options` — there is no site that could ever populate them.

## The `repo` field (multi-repo skills only)

Present only on a skill whose autopilot-resolvable decisions can repeat once per repo within a single run (a multi-repo workspace run) — omitted entirely for a single-repo run, and omitted entirely by a skill with no per-repo-resolved site. Holds the repo the logged decision applies to.

## The `[autopilot best-guess]` / `_(autopilot)_` marker convention

Two related, but distinct, conventions:

1. **In the jsonl log itself**, an `open_text` site's `chosen` value is the free-text self-answer, typically produced by prefixing it `[autopilot best-guess]` inline wherever that skill's resolution table calls for a best-guess inference — this is just ordinary text content of `chosen`, not a separate field.
2. **In a skill's own user-facing deliverable** (a refined ticket, an epic, a plan — whatever that skill produces), a skill that also marks which of its own answers came from autopilot rather than a human uses this pattern: an `open_text` best-guess answer keeps its `[autopilot best-guess]` prefix in the deliverable's own decision-log cell; a straightforward `(Recommended)`-pick resolution with no open-ended guessing instead gets `_(autopilot)_` appended after the answer text. This lets a reviewer reading the deliverable alone, without the jsonl log, see which decisions weren't confirmed by a human. Not every skill's deliverable has its own decision-log table to mark this way — a skill that does names this explicitly in its own Decision log section.

## The `chosen: null` stopped-site convention

A hard-stop site that actually fires during an autopilot run is still logged, with `chosen: null` — never omitted. A site that's merely moot this run (never reached, or already resolved from a prior run) is not logged at all. This is distinct from a skill that simply never has a hard-stop to fire (e.g. `shape-the-epic`, `slice-the-epic`) — such a skill's `chosen` never needs the `null` branch at all, and its own Decision log section says so.
