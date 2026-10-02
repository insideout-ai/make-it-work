# Autopilot decision-log schema

Shared reference for the `**Decision log:**` section every `--autopilot`-enabled skill documents in its own `SKILL.md`. Each skill's own section states its own log filename and write-timing behavior (these differ per skill and stay there), then points here for the field shape, naming only its own deltas from the general shape below.

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
