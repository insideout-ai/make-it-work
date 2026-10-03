---
name: find-the-repos
description: "Given a ticket, shortlists which repositories in a multi-repo workspace it affects, by matching the ticket against each repo's product.md (falling back to architecture.md when the ticket is purely technical, with no business-logic content to match). Reports definite and possible matches, confirms the shortlist with the user — who may adjust it — then saves it. Use when you need to know which repo(s) a ticket belongs to, in a workspace with more than one repo, before refining or planning it."
disable-model-invocation: true
---

# Find The Repos

**Role:** Act as the routing step that runs before any refinement or planning work starts on a ticket, in a workspace that holds more than one repo.

**Goal:** Read a ticket, work out which repositories in the workspace it actually belongs to, and hand back a confirmed shortlist — so nobody has to open every repo's docs by hand to find out where a ticket lands before running `close-the-gaps` or `plan-the-work` against it.

---

## Usage

```
/make-it-work:find-the-repos [TICKET-ID | path/to/spec.md] [--autopilot]
```

Or paste the ticket content directly into the chat after invoking.

- Pass a ticket key (e.g. `PROJ-123`), an explicit path to a spec or ticket file, paste the ticket content directly, or nothing (the skill derives the key from the current branch).
- This skill ships standalone: nothing else in this plugin calls it yet, and it isn't part of the `close-the-gaps → plan-the-work → execute → review-the-pr` pipeline. Run it on its own, whenever a ticket's home repo isn't already obvious, before starting that pipeline.
- **No argument** — interactive. Every checkpoint below pauses for a human, exactly as documented.
- **`--autopilot`** — unattended. At every interactive point below, apply the Autopilot Mode policy instead of pausing.

## Autopilot Mode

**Hard-stop exception:** no destructive action exists in this skill — `find-the-repos` only reads repo documentation and saves a shortlist file; it never deletes or overwrites anything but its own regenerable `make-it-work/<TICKET>-repos.md` output. Five sites nonetheless remain unconditional stops under `--autopilot`, because autopilot cannot safely infer an answer for any of them:
- Phase 1 point 1's single-repo-with-no-workspace refusal ("nothing to shortlist").
- Phase 1 point 2's ambiguous repo pick among unrelated clones with no unifying doc.
- Phase 1 point 3's "Could not identify the project root" message.
- Phase 2 point 3's underivable `<TICKET>` key (no argument, no branch-derivable key).
- Phase 2 point 3's tracker-fetch failure (no local spec, fetch fails or is unavailable).

**Decision log:** write `.claude/find-the-repos-autopilot-log.jsonl` at repo root, created fresh (truncated to empty) at the start of the run. Field shape follows the shared schema in `docs/autopilot-log-schema.md` — this skill has only `"checkpoint"` sites (no `askUserQuestion` or `open_text`), so it omits `multiSelect`/`question`/`options` entirely and `chosen` is only ever a short string describing what was confirmed, or `null` for a site that stopped rather than resolving. Every line also still includes `rationale` (one sentence), per the shared schema's core fields. `phase` examples: `"Phase 1"`, `"Phase 4"`. `site` example: `"shortlist-confirmation"`.

**Resolution table** (one row per interactive site, in the order they appear):

| Phase | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| Phase 1 | single repo, no workspace-root orientation file | `checkpoint` | Unconditional stop, unaffected by autopilot — see Hard-stop exception above. |
| Phase 1 | ambiguous repo pick among unrelated clones with no unifying doc | `checkpoint` | No safe default — which repo even exists isn't a product-policy choice to infer. Stop and require a human. |
| Phase 1 | "Could not identify the project root" | `checkpoint` | Unconditional stop, unaffected by autopilot. |
| Phase 2 | no ticket key derivable from the argument or the current branch | `checkpoint` | Unconditional stop, unaffected by autopilot — autopilot cannot invent a ticket key. |
| Phase 2 | tracker fetch fails (no local spec, fetch unavailable/fails) | `checkpoint` | Unconditional stop, unaffected by autopilot — autopilot cannot fabricate ticket content. |
| Phase 4 | shortlist confirmation | `checkpoint` | Auto-confirm the draft shortlist as-is; proceed to report and save. Non-destructive — a human can always adjust the shortlist on a later run. |

At the end of an autopilot run, print a short human-readable summary of every auto-resolved decision and the log file's path, so someone can audit the run afterward.

---

## Phase 1 — Workspace Detection

This phase mirrors `plan-the-work`'s Step 1a — keep in sync if that logic changes — with one deliberate divergence, called out at point 2 below.

Run `pwd`, then decide whether this is a **single repo with no workspace** or a **coordinated multi-repo workspace**, because there is nothing to shortlist between if there's only one repo to choose from. The distinction is not "does the parent hold other repos" — a bare folder of unrelated clones is not a workspace. It is "are these repos documented as one system": a **workspace-root orientation file** (a top-level `CLAUDE.md` / service map describing the sibling repos and how they call each other) is the signal that turns a folder of repos into a workspace.

1. **`.git` exists here.** This repo is a project root. Then:
   - If the **parent** holds a workspace-root orientation file that describes this repo as one service among siblings → you are inside one service of a multi-repo workspace; the **workspace root** is the parent (`..`). Read that file for the candidate repo list.
   - Otherwise → **tell the user there is nothing to shortlist and stop.** Do not proceed to Phase 2. (autopilot: see Autopilot Mode) (**This is the divergence from `plan-the-work`'s Step 1a:** that skill treats this exact situation as an ordinary single-repo project and proceeds to plan against the one repo it found. `find-the-repos` refuses instead — a single repo with no workspace-root orientation file tying it to siblings has nothing to shortlist between, so trivially "matching" the one repo it's sitting in would tell the caller nothing they didn't already know.)
2. **No `.git` here, but subdirectories have their own `.git`.** If a workspace-root orientation file ties them together → multi-repo workspace, root is here; read that file for the candidate repo list. If they are just unrelated clones with no unifying doc → **ask the user which repo(s) to check**, rather than guessing. (autopilot: see Autopilot Mode)
3. **None of these resolve** → tell the user: "Could not identify the project root. Please launch from the repo root, a service subdirectory, or the workspace root." and stop. (autopilot: see Autopilot Mode)
4. For each repo named in the orientation file: if its directory does not exist on disk, exclude it from the candidate list and note it explicitly in the eventual output as "`<repo-name>` named in the workspace file but not found on disk" — the same explicit-flagging treatment Phase 3 gives a candidate with no `product.md`, rather than silently dropping it.

Everything from Phase 2 onward operates only on the candidate repo list this phase produced.

---

## Phase 2 — Ticket Ingestion

This phase only runs once Phase 1 has resolved a workspace with at least one candidate repo — a single-repo refusal or an unrelated-clones question stops before this phase is ever reached, so no issue-tracker call happens on a run that was going to refuse anyway.

Resolve the ticket using this precedence — matching `plan-the-work`'s Step 1b, not `close-the-gaps`'s ticket-ingestion order, since `find-the-repos` is meant to be runnable standalone, before any refined spec necessarily exists:

1. **Explicit file path.** If the argument is an explicit path to a file, read it directly as the ticket/spec content and use it as-is. Do not touch any issue tracker at all — this path is a hard override of everything below it.
2. **Pasted content.** If content was pasted directly into the session instead of an argument being given, parse it as-is — work with whatever is there, even if it's only a raw description. This takes priority over step 3's "ask and stop" fallback: if the ticket content is already in hand this way, do not ask the user for a ticket key before proceeding — a key is only needed for the local-cache lookup and artifact filename, and the fallback below covers deriving one when there isn't one.
3. **Ticket key, then local cache, then tracker.** Otherwise (no explicit path, and nothing pasted), determine a `<TICKET>` key:
   - If the argument looks like a ticket key, use it.
   - Otherwise, derive it from `git branch --show-current` in the resolved workspace root's current repo (e.g. `feature/PROJ-123-add-x` → `PROJ-123`).
   - If neither yields a key, ask the user for the ticket key or an explicit spec path, and stop until they answer — never proceed with an undefined `<TICKET>`. (autopilot: see Autopilot Mode)

   Once a key is known, look first for `make-it-work/<TICKET>-spec.md` at the resolved workspace root — this is `close-the-gaps`'s own output, and reading it if it already exists means matching against the richest, already-refined description of the ticket rather than a raw one. If that file doesn't exist, fetch the ticket via whatever issue-tracker MCP integration is configured for this project. If the fetch fails (no access, tool unavailable, ticket not found), say so plainly and ask the user to paste the ticket content directly instead of retrying silently or fabricating ticket content. (autopilot: see Autopilot Mode)

**Deriving `<TICKET>` when there is no ticket key.** Steps 1 and 2 above can both supply ticket content without ever supplying a `<TICKET>` key — an explicit spec file's name may not be a key, and pasted content may have none. When that happens, derive `<TICKET>` the same way `close-the-gaps` already does: a kebab-case slug of the ticket's title (or first line, if it has no clear title), or, if no usable title exists either, a dated fallback (e.g. `2026-09-30-find-the-repos`). Use this derived value everywhere `<TICKET>` appears below; the local-cache lookup in step 3 doesn't apply in this case, since there was no key to look one up by.

Read the resolved ticket content in full before proceeding to Phase 3.

---

## Phase 3 — Matching

For each candidate repo Phase 1 produced that has a `.claude/rules/product.md`, compare the ticket's content against that file's use-case table and domain concepts. This comparison is direct model judgment against the criteria below — there is no scoring algorithm, keyword-overlap threshold, or embedding-similarity computation involved:

- **Definite** — the ticket clearly maps to a specific use case or domain concept named in that repo's `product.md`.
- **Possible** — there is only partial or topical overlap with that repo's `product.md`; the ticket does not clearly map to any one named use case there.
- Never apply a cutoff that drops a possible match silently. Both tiers are always reported, even when a definite match already exists elsewhere — a false positive here is far cheaper than a repo the caller never finds out they should have checked.
- Report only repos whose **own** `product.md` matches the ticket directly. Do not add a repo just because the workspace-root orientation file shows it is connected (upstream or downstream) to a repo that already matched — that ripple-effect analysis belongs to a later planning step's own code investigation, not to this skill's shortlisting.
- This also applies when a repo's **own** `product.md` documents that same kind of connection about itself (e.g., a note that it consumes data from, or feeds, a concept owned by another repo). A cross-repo relationship note like that describes an upstream/downstream link, not a use case or domain concept this repo itself owns — it does not, by itself, count as topical overlap for this repo's own match.
- A candidate repo with no `product.md` at all is excluded from matching entirely — there's nothing to compare the ticket against — but is named explicitly in the output as "`<repo-name>` excluded — no `product.md`" rather than silently dropped.

**Before running the comparison above, check whether the ticket reads as purely technical** — a dependency upgrade, an infrastructure change, or a refactor with no business-logic content that any repo's `product.md` could ever plausibly match, by design, no matter how thoroughly it's read. If the ticket is purely technical:

1. State this explicitly in the eventual output, distinct from an ordinary no-match — the absence of a `product.md` match here means "this kind of ticket doesn't map to business logic," not "no repo owns this."
2. Re-run the same comparison, using the same definite/possible criteria above, against each candidate repo's `architecture.md` instead of its `product.md`.
3. Report that `architecture.md`-based shortlist as the draft shortlist in place of a `product.md`-based one.

If the ticket is not purely technical, run the ordinary `product.md`-based comparison described above instead.

---

## Phase 4 — Confirm & Save

Present the draft shortlist to the user and wait for their explicit confirmation before treating anything as final — this checkpoint mirrors `close-the-gaps`'s and `plan-the-work`'s own heavier confirmation discipline rather than a no-checkpoint reporting style. Show:

- **Definite matches** — each repo name with **1–2 sentences of reasoning**, not just a one-line label, so the user can sanity-check the match without having to go open that repo's `product.md` (or `architecture.md`, if the technical fallback fired) themselves.
- **Possible matches** — the same shape: repo name plus 1–2 sentences of reasoning.
- **Excluded / flagged repos** — every repo skipped for having no `product.md` (or, in the technical fallback, no `architecture.md`) and every repo named in the workspace file but missing on disk, each with a one-line reason.

Wait for explicit confirmation before doing anything else. (autopilot: see Autopilot Mode) If the user adds or removes a repo from the draft before confirming, use that adjusted list — not the original draft — for everything below; the adjusted list is what gets reported and saved, in full, as if it had been the draft all along.

Once the shortlist is confirmed:

1. **Report a chat summary** of the final shortlist, including each match's 1–2 sentences of reasoning.
2. **Save it** to `make-it-work/<TICKET>-repos.md` (create the `make-it-work/` folder at the resolved workspace root if it doesn't exist), with this shape:

```markdown
# Repo Shortlist — <TICKET>

<!-- Include this note only when the purely-technical fallback fired in Phase 3. -->
> **Note:** this ticket reads as purely technical, with no business-logic content any repo's
> `product.md` could match. The shortlist below matches against each candidate repo's
> `architecture.md` instead.

## Definite Matches

- **<repo-name>** — <1–2 sentences of reasoning>

(or, if none: `None`)

## Possible Matches

- **<repo-name>** — <1–2 sentences of reasoning>

(or, if none: `None`)

## Excluded

- **<repo-name>** — <one-line reason, e.g. "no `product.md`" or "named in the workspace file but not found on disk">

(or, if none: `None`)
```

The `## Definite Matches`, `## Possible Matches`, and `## Excluded` sections are always present, each written as `None` when empty rather than omitted — the same "keep every section, write None where empty" convention this plugin's other saved artifacts already follow.
