# make-it-work

> From idea to delivery: make your codebase AI-ready with context skills, shape requirements, slice work, plan implementation, review changes against the requirements and codebase guidance — or orchestrate the whole flow for a ticket with `implement`.

Built for engineering teams working on large, complex codebases. Not greenfield side projects. When your codebase has history, domain rules, and legacy decisions baked in, "generally smart" isn't enough. Claude needs to know *your* project.

## The problem

Claude reads code well. But on a large, long-lived codebase it misses things - domain rules buried in old commits, implicit constraints never documented, business logic spread across layers. It guesses. The bigger the repo, the worse it gets.

`make-it-work` solves this at the source.

## How it works

### `/make-it-work:go-deep`

`go-deep` maps your codebase and builds a structured knowledge base that Claude loads before doing any work:

- **How and what** (always loaded) - two rule files: `architecture.md` is the *how* (domains, components, code areas), `product.md` is the *what* (use cases, actors, business rules).
- **Skills** (loaded on demand) - one per functional domain, one per use case. Each skill is a precise, minimal description of one area of your code - enough for Claude to navigate, not so much it bloats the context.

**The cross-reference map**

Every domain skill points to the use cases it affects. Every use case skill points to the domains it touches. Claude uses these cross-references automatically - when planning a feature it follows links to understand which domains are involved; when planning tests it traces which use cases are affected by a domain change, covering progression and regression without you having to map it out.

**Context efficiency**

Skill descriptions are written to be minimal but precise. Claude reads the description and decides whether to load the skill - it never pulls in unneeded information. The bigger the codebase, the more this matters: Claude gets exactly the context it needs for the task at hand, nothing more. No hallucinating, no misunderstanding, whether planning or executing.

**Staying in sync**

Part of what `go-deep` builds is a hard enforcement rule in CLAUDE.md: before every commit, Claude checks whether any skill or doc needs updating. New domain? Create the skill. Existing domain changed? Update it. Nothing ships without the knowledge base staying in sync with the code.

Run `go-deep` once when you onboard a project.

Fresh projects get numbered domain skills such as `domain-01-authentication`, alongside numbered UC skills. IDs stay stable as domains are added. Existing projects retain their domain naming convention, including unnumbered names; go-deep does not migrate or rename them. The generated CLAUDE.md tells future feature work how to name new domains using that convention.

**What the code can't tell you**

During `go-deep`, Claude asks targeted questions so the how and what files capture what can't be learned from reading the code alone - giving Claude the full picture of the project, not just its structure.

Interactive runs use question prompts for four review checkpoints: scope, documentation foundations, sample skills, and final acceptance. Each shows what to review and what happens next, with choices to approve, request changes, or pause. Repair confirmations use the same pattern. If a question tool is unavailable, the run stops with an explicit "Waiting for your confirmation" prompt; `--autopilot` keeps its unattended behavior.

The questioning phase reveals what Claude misunderstands about your code - surfacing domain concepts not obvious from reading files, business rules that live only in developers' heads, and assumptions baked into the architecture that were never written down. Answering those questions produces documentation no static analysis tool can generate: the *why* behind the *what*.

The skills produced are also useful outside Claude Code. Product managers can read domain and use case skills to understand what the system actually does, making them a live source of truth for writing requirements.

---

### `/make-it-work:define-test-strategy`

`define-test-strategy` is the onboarding step after `go-deep`: it builds one repo's test-strategy skill, `.claude/skills/test-strategy/SKILL.md`. The skill records where that repo's tests live — including in other repos, such as a separate QA automation repo — how to run each suite and what it needs (env vars, services, CI-only suites), and where new tests of each layer belong. It tags existing tests with repo-qualified `@covers <repo>:UC-<id> <repo>:domain-<name>` comments, left uncommitted for you to review, and adds a single `/test-strategy` row to the `CLAUDE.md` Skills Reference. It ends with a coverage report computed live from those tags; re-run it and choose "Coverage report only" any time for a fresh view.

For repos without test tooling, it also proposes an initial setup based on the actual stack, architecture and use cases: tools/layers, placement, proposed commands and first coverage priorities. Recommendations stay separate from configured commands. This skill does not install tooling or create tests.

Run it once in each repo, right after `go-deep`; pass `[repo]` to onboard a repo from a workspace root. If `go-deep` hasn't run there, it offers to run it first, or to continue with tagging left pending. Projects onboarded with an older version are migrated on the next run: the old `.claude/rules/testing-strategy.md` content is carried into the new skill, path-based tags become `@covers` comments, the old `CLAUDE.md` rule row and regression checklist item are removed, and leftover placeholder tests are listed for you to delete.

---

### `/make-it-work:run-regression`

`run-regression` runs a project's regression suite - the full suite, one repo's suite (`full:<repo>`), or the tests tagged with repo-qualified use-case and domain tokens (e.g. `payments-api:UC-08`, `payments-api:domain-velocity`). One call can mix tokens for several repos. It reads each repo's test-strategy skill for its test locations, commands and prerequisites, finds tagged tests by grepping their `@covers` comments across every location (including other repos), and falls back to `package.json`/`Makefile`/CI discovery for the full suite when a repo has no strategy. A bare `full` runs each repo's own suite only. Suites that can't run locally (CI-only, missing env vars or services, no tests in the repo) are reported as not run, never as failures. Results are reported live in chat, with nothing persisted to disk.

Use it directly during day-to-day development to check a change against the regression suite, full or scoped. It's also the shared implementation `execute` calls as its completion gate at the end of a plan, instead of writing its own test-running logic.

---

### `/make-it-work:shape-the-epic`

Shapes an epic for any work management tool (Jira, Azure DevOps, Linear, Shortcut) in **Product** or **Technical-debt** mode. Choose the readiness categories to focus on, then work through the discovery interview and gap-check. After the interview, it generates the complete Markdown epic directly for consolidated feedback, without a category-by-category content approval round. Real unknowns remain scoped TBDs; unselected categories are marked **Not assessed**.

Product mode covers value proposition, users and permissions, KPIs, use cases, rollout, and completion. Technical-debt mode centers on evidence and impact, desired outcomes, testable acceptance criteria, verification, and scope boundaries. Material agreed constraints or external dependencies are optional. The skill does not collect ownership; implementation planning is outside the default technical-debt epic. `--autopilot` resolves selection and interview questions unattended and adds an audit log.

---

### `/make-it-work:slice-the-epic`

Offers 2–3 tailored slicing techniques or combinations, recommends one, and lets you choose before generating the backlog. Each slice has a stable ID and acceptance criteria or technical completion evidence, with a default sizing guideline of half a sprint when team expectations are unknown.

Saves every slice in `make-it-work/slices-[epic-title]-[timestamp].md`, together with a Mermaid dependency map, a readable dependency table, and recommended implementation stages. Distinguishes hard prerequisites from preferred sequencing, identifies parallel work, and proposes an MVP boundary. `--autopilot` selects and logs the recommended approach.

Use it when a ticket or epic feels too big and needs to become sprint-sized stories. Tell Claude things like "this ticket is too large," "break this into smaller pieces," or "help me write user stories for this epic," or invoke it directly with `/make-it-work:slice-the-epic`.

---

### `/make-it-work:find-the-repos`

`find-the-repos` first checks whether the ticket's exact identifiers, endpoints, and UI labels already exist, leading the report with **verify and finish** when implementation is found. It then shortlists repos using docs, domain/use-case skills, and bounded code searches; specific code evidence can establish **Definite** even without docs. Workspace detection accepts catalog metadata, repo lists, and workspace configs as well as CLAUDE.md. It assesses **all repos by default**, even in a large sibling-repo workspace without grouping metadata; no repo-selection round is required. You can explicitly narrow the scope. Genuine workspace/scope choices use AskUserQuestion when available, without giant checkbox lists. One report, `<TICKET>-repos.md`, holds all assessment details, ownership sources/conflicts, and external routing; comments, revisions, and confirmation update that same file. The terminal shows only a compact **Definite repos / Owner(s) / Evidence** table, with supporting types `product.md`, `architecture.md`, `context skills`, and/or `code`, plus a report link and review prompt. Pasted tickets can use a provisional slug without borrowing related ticket keys.

Unlike the fixed `close-the-gaps → plan-the-work → execute → review-the-pr` pipeline, `find-the-repos` ships standalone: nothing else in this plugin calls it yet. Run it on its own, before that pipeline starts, whenever a ticket's home repo isn't already obvious.

---

### `/make-it-work:close-the-gaps`

`close-the-gaps` acts as a Product Analyst before development begins. It loads the project skills relevant to the ticket, digs into the affected code, and surfaces every gap - unclear language, missing edge cases, conflicting requirements, unstated assumptions - then walks you through them one question at a time. It can also run in an **offline mode** — export every question to a file to answer outside the session, then re-invoke pointing at that file to inject the answers and resume — for when the person who can answer isn't available live.

The output is a Gherkin-ready refined spec. Unknown unknowns become explicit. Requirements are solid before a single line of code is written.

Teams use it before refinement meetings so developers arrive with focused questions rather than discovering gaps mid-discussion. Or post the output directly to the Jira ticket for product to review asynchronously - no meeting needed for straightforward tickets.

The cost of a vague ticket is paid in rework. `close-the-gaps` closes the gaps before the first line of code.

---

### `/make-it-work:plan-the-work`

Turns an agreed spec or refined ticket into an execution-ready implementation plan before any production code is written. It loads the project's guidance and relevant skills, investigates the real code paths across one or more repositories, closes technical and scoping gaps with you, and writes an atomic, verifiable plan to `make-it-work/<TICKET>/<TICKET>-plan.md`. When the target project has a test framework configured, it also writes and confirms each step's progression (red) and regression (currently-passing) tests — including minimal, clearly-marked stub signatures on a typed or dynamic stack where needed to reach a valid runtime red state — left uncommitted in the working tree; projects with no test framework configured are unaffected. With a test-strategy skill, new tests go where the strategy says, tagged with `@covers`, and a QA repo that receives them joins the plan as test scope. The plan also records the domains and use cases it touches for the regression gate.

Pass a ticket ID or a spec path, or let the skill derive the ticket from the current branch. Use it after `close-the-gaps` and before implementation so another engineer or agent can execute the work step by step without guessing.

---

### `/make-it-work:execute`

Implements a plan `plan-the-work` already wrote, step by step: it writes each step's code, re-runs that step's tests until they pass with a 5-attempt retry limit before asking for help, and halts the whole plan - rather than guessing - whenever a failing test looks like a real product-behavior question instead of a test bug. Once every step is green, it runs `run-regression` as a completion gate — the tests tagged with the plan's touched domains/use-cases in every repo, plus the full suite of each repo the plan changes, or just the full suite when the plan records no tokens or none of their repos has a test strategy — and stops for your triage on a gate failure instead of trying to auto-fix it. It never commits on your behalf, leaving all finished work in the working tree for you to review.

Pass a ticket ID or a path to a plan file, or let the skill derive the ticket from the current branch. Use it after `plan-the-work` to turn an execution-ready plan into actual code, completing the `close-the-gaps` → `plan-the-work` → `execute` → `review-the-pr` pipeline.

---

### `/make-it-work:review-the-pr`

Acts as a reviewer grounded in the project's own documentation instead of generic intuition. Runs three passes - business correctness against the `uc-*` skills, regression safety against the `domain-*` skills and architectural constraints, and coding standards against `CLAUDE.md` - then a docs-sync check to confirm skills were updated alongside behavior. A new or changed test for a touched use case or domain with no `@covers` tag is flagged as Minor. Emits a verdict-first, evidence-dense report, both as a pasteable file and a scannable chat summary.

Use it to review a pull request or diff in any repo that keeps the `go-deep` knowledge base (`CLAUDE.md` plus `uc-*`/`domain-*` skills and `.claude/rules` docs).

---

### `/make-it-work:implement`

Orchestrates the whole pipeline for one ticket: it checks that the project has its `go-deep` context, then runs `close-the-gaps` → `plan-the-work` → `execute` → `review-the-pr`, and finishes by syncing the project's skills and rules files with what was actually built. It stays thin — each stage skill keeps owning its own reasoning; `implement` decides what runs next, reads each stage's outcome, and enforces the loop limits.

Before planning, new runs resolve testing readiness for each affected repo. Existing tooling is discovered and its strategy generated/refreshed. With no tooling, Guided offers minimal automated setup or manual verification; Autonomous and Autopilot establish the recommended minimal setup unless manual verification was explicitly selected. Setup includes a real passing behavior test, and its files become the planning baseline. A failed setup cannot silently switch to manual mode. The plan records each repo's verification policy; all-manual execution can complete with observed scenario/AC evidence and `VERIFIED_MANUALLY`, while mixed execution requires both manual evidence and each automated repo's full suite. Manual completion is reported as such, with automated regression unavailable. Older resumed runs keep their original gate behavior.

```mermaid
flowchart TD
    Start(["/make-it-work:implement TICKET"]) --> Gaps["close-the-gaps"]
    Gaps --> Plan["plan-the-work"]
    Plan --> Execute["execute"]

    Execute -- "passed" --> Review["review-the-pr"]
    Execute -- "tests failing or stuck" --> FixPlan["fix the plan"]

    Review -- "clean" --> FinalSync["Final context sync"] --> Complete(["Complete"])
    Complete -. "optional" .-> Deliver["deliver: commit, push, PR"]
    Review -- "changes requested" --> FixPlan

    FixPlan -- "steps added" --> Execute
    FixPlan -- "plan needs rethinking" --> Replan["Replan"] --> Plan
```

You choose the autonomy level before the branch decision on a new run. **Guided** pauses for your approval after the spec and after the plan. **Autonomous** skips those approval gates and replans on its own when the plan stops holding; in both modes, every question a stage asks still comes to you. **Autopilot** runs implementation unattended with each stage's documented safe defaults, creates the ticket-named feature branch automatically when started from the base branch, and leaves all resulting changes uncommitted. It stops with a saved, actionable reason rather than guessing when a required fact is missing, contradictory, or needs a product decision. **`--autopilot`** skips the initial autonomy question and selects the same mode.

When review asks for fixes, or the final regression run breaks a test tied to the ticket's own requirements, the fixes are added to the plan as new test-first steps, and execution continues from there. Regressions unrelated to the ticket are documented in the summary, not fixed. A project without an automated test suite can continue with the plan's manual test walkthrough instead. Fix rounds are capped at 3 and reviews at 4 per plan version (one initial review plus one re-review per fix-plan round), and replans at 2 per run, so a run never loops indefinitely.

New runs keep their artifacts in `make-it-work/<TICKET>/`, with familiar `<TICKET>-` filenames inside. Progress is saved to `make-it-work/<TICKET>/<TICKET>-state.md` at every step, so running `implement` again resumes where it stopped — and if the repository changed in the meantime, it shows you what changed instead of assuming it's still safe to continue. Alongside it, a per-ticket progress dashboard (`make-it-work/<TICKET>/<TICKET>-status.html`) is created when a run starts and refreshed at every checkpoint, so you can see the run's phase, cycle counts, transition history, and — whenever it's waiting on you — what to do next, without reading the raw state file. Interactive runs ask before starting on the base branch; autopilot creates the safe suggested feature branch instead. Neither mode commits implementation changes, pushes, or opens a PR. Existing flat artifacts are left untouched; this version discovers nested runs only.

New `implement` runs also save a small, versioned JSON result after each stage. A local validator checks the result and its artifacts, and a read-only transition helper selects the next phase from that result and the saved state. Runs started before this handoff format continue with their original reports and routing rules until they finish.

New runs also retain a verification ledger as Execute follows the existing test-first plan: each completed step records the checks it actually ran before its progress checkpoint, and the existing completion gate records its result. The ledger maps the plan's acceptance criteria to passing automated or manual checks, or marks them unverified. Review and the final package read this evidence; no extra validation phase or duplicate test run is added. Older runs continue without a ledger.

After a clean review and final documentation sync, new runs build a local final-approval package containing the changed-file list, binary-safe diffs, validation and review evidence, known regressions and review nits, plus draft commit and PR text. Guided runs ask you to approve that exact package; Autonomous and Autopilot leave it ready for your later review. A changed working tree or evidence invalidates the package and any prior approval. The workflow still does not commit, push, or open a PR.

At completion of a package-enabled run, `implement` always asks whether to prepare delivery, including in Autopilot. Skipping or leaving that question unanswered does not change the completed result. Opting in starts the separate `/make-it-work:deliver <TICKET>` workflow, which previews the exact repositories, branches, paths, commit message, and PR text and requires a separate explicit approval before committing, pushing to `origin`, or creating or updating PRs. The dashboard shows Deliver as an optional step after Complete; its completion banner stays focused on the implementation result. Delivery supports GitHub (authenticated `gh` CLI) and Bitbucket Cloud (token supplied outside chat), tracks partial multi-repo progress for safe retries, and never merges or posts to Jira. Unsupported remotes and sensitive file paths require manual delivery.

The same dashboard follows delivery through the choice, approval, running, partial/failed, and delivered states. The helper refreshes existing HTML at delivery checkpoints and shows each repo's actual commit, push and PR results with links; the implementation remains Complete with its original timing. The page polls while delivery is pending or running, then stops on a terminal delivery result. Selecting Not now records that delivery was not requested. Older delivery journals are supported by regenerating the HTML once; an already-open page from the older renderer needs one reload afterward. Delivery never creates a dashboard for an older run that did not have one.

After a run completes, `implement` adds an anonymous, share-safe entry to the cumulative `make-it-work/implement-feedback.md` file. Clean runs get a compact entry; runs that needed fix or replan rounds get a retrospective that identifies where the workflow could improve, asking the user one clarification at a time only when the answer could change that diagnosis. The same happens when a run stops because a fix, review, or replan limit was exhausted. Feedback is written only after the workflow is already terminal, never changes its result, and is never uploaded automatically — review the file yourself before choosing whether to send it to the make-it-work owners.

Use it when you want one command to take a ticket from request to a reviewed, documented implementation, in a repo that has been onboarded with `go-deep`.

---

## Keep improving

When Claude gets something wrong, don't just correct it - ask why it missed. What was unclear in the skills or rules? Update them so it doesn't happen again. Every misunderstanding is a chance to make the knowledge base more accurate. Over time the system gets sharper, not stale.

---

## Usage

```
/make-it-work:go-deep                        # Scaffold full project docs from scratch
/make-it-work:define-test-strategy [repo]    # Build a repo's test-strategy skill and tag its tests; run once per repo
/make-it-work:run-regression [full | full:<repo> | <repo>:UC-<id> | <repo>:domain-<name> ...]  # Run the regression suite, full or scoped
/make-it-work:shape-the-epic                 # Write a complete epic from scratch or improve an existing one
/make-it-work:slice-the-epic                 # Slice a large requirement into sprint-sized Gherkin user stories
/make-it-work:find-the-repos TICKET-123  # Shortlist which repo(s) in a multi-repo workspace a ticket affects
/make-it-work:close-the-gaps TICKET-123      # Refine a ticket by ID
/make-it-work:close-the-gaps                 # Paste ticket content directly
/make-it-work:close-the-gaps TICKET-123 --offline            # Export gap-analysis questions to a file instead of asking live
/make-it-work:close-the-gaps make-it-work/TICKET-123/TICKET-123-questions.md  # Resume and inject answers from that file
/make-it-work:plan-the-work TICKET-123       # Turn a refined spec into an implementation plan
/make-it-work:plan-the-work path/to/spec.md  # Plan from an explicit local spec
/make-it-work:execute [TICKET-ID | path/to/plan.md]  # Execute a plan step by step, then run the completion gate
/make-it-work:review-the-pr                  # Review a PR against the project's own skills and CLAUDE.md
/make-it-work:implement TICKET-123           # Run the whole pipeline for a ticket, with saved state
/make-it-work:implement TICKET-123 --autopilot # Run the pipeline unattended using safe documented defaults
/make-it-work:implement path/to/spec.md      # Start the pipeline from an existing spec
/make-it-work:implement                      # Resume an in-progress implement run
```

## Requirements

- [Claude Code](https://code.claude.com/docs/en/overview), installed and authenticated.
- A project workspace, ideally a Git repository. `go-deep`, `define-test-strategy`, and `review-the-pr` inspect the repository's code and documentation. `plan-the-work` does the same and, when a test framework is configured in the target project, also writes per-step progression and regression test files, left uncommitted in the working tree.
- For ticket IDs such as `TICKET-123`, a separately installed and configured issue-tracker integration. You can always paste the ticket content instead.

`review-the-pr` is most effective after `go-deep` has created the project's `CLAUDE.md`, `.claude/rules` documentation, and domain/use-case skills.

## Install

Choose one installation channel. Installing the plugin from both marketplaces can make it unclear which copy Claude Code is loading.

### Anthropic community marketplace

Use the community marketplace for the curated distribution. Community catalog updates may lag behind a new upstream release; use the InsideOut AI marketplace when you need the newest publisher release immediately.

```text
/plugin marketplace add anthropics/claude-plugins-community
/plugin install make-it-work@claude-community
```

### InsideOut AI marketplace

Use the publisher's marketplace for the direct upstream distribution:

```text
/plugin marketplace add insideout-ai/make-it-work
/plugin install make-it-work@insideout-ai
```

Reload Claude Code after installation if the skills do not appear immediately:

```text
/reload-plugins
```

## Update

Update the marketplace metadata first, then update the plugin from the same channel you used to install it.

Community marketplace:

```text
/plugin marketplace update claude-community
/plugin update make-it-work@claude-community
```

InsideOut AI marketplace:

```text
/plugin marketplace update insideout-ai
/plugin update make-it-work@insideout-ai
```

Run `/reload-plugins` or restart Claude Code after updating.

## Example workflows

Onboard an established repository, create its project knowledge base, and define its test strategy (run both in each repo):

```text
/make-it-work:go-deep
/make-it-work:define-test-strategy
```

Turn a rough feature idea into an elaboration-ready epic, then split it into independently valuable stories:

```text
/make-it-work:shape-the-epic Add delegated account access for enterprise customers
/make-it-work:slice-the-epic
```

In a multi-repo workspace, shortlist which repo a ticket belongs to before refining it:

```text
/make-it-work:find-the-repos TICKET-123
/make-it-work:close-the-gaps TICKET-123
```

Refine a ticket, then turn the agreed spec into an implementation plan:

```text
/make-it-work:close-the-gaps TICKET-123
/make-it-work:plan-the-work TICKET-123
/make-it-work:execute TICKET-123
```

Run a scoped regression check against the domain you're actively working on:

```text
/make-it-work:run-regression payments-api:domain-velocity
```

Review the current pull request against the repository's documented product behavior and architecture:

```text
/make-it-work:review-the-pr
```

Run the whole pipeline for a ticket, from refinement to a reviewed, context-synced implementation:

```text
/make-it-work:implement TICKET-123
```

## Data access and permissions

This plugin contains Markdown-based skills and local helper scripts for progress, feedback, validated stage handoffs, final packages, and optional delivery. It bundles no MCP servers or telemetry. When you invoke a skill, Claude may read files in the current project and may propose or write project documentation and review artifacts as part of that workflow; `run-regression` additionally runs the target project's own already-configured test command via Bash. `implement` also maintains the local `make-it-work/implement-feedback.md` retrospective file, but never uploads or submits it. Only the separate, explicitly approved `deliver` command commits or performs remote writes (push and PR creation/update).

Unlike the other pipeline skills, which only read code and write review/planning artifacts under `make-it-work/`, `define-test-strategy` also writes directly into the target project itself: it generates `.claude/skills/test-strategy/SKILL.md`, adds `@covers` tag comments to existing test files — possibly in other repos that hold this repo's tests — left uncommitted, and adds a `/test-strategy` row to the `CLAUDE.md` Other Skills table. When migrating an older setup, it also deletes `.claude/rules/testing-strategy.md` and removes that file's `CLAUDE.md` Rules Files row and its regression checklist item. It never commits, and never deletes placeholder tests left by older versions; it only lists them.

`plan-the-work` also writes directly into the target project itself when a test framework is configured there: it writes per-step progression and regression test files — including minimal, clearly-marked stub signatures where needed to reach a valid runtime red state — and leaves them uncommitted in the working tree, exactly like `execute`'s own changes. Projects with no test framework configured are unaffected; `plan-the-work` falls back to its prior behavior of only writing planning artifacts under `make-it-work/`.

`execute` goes further still: unlike `define-test-strategy` (which edits test files only to add tags) and `plan-the-work` above, which never write the production code itself, `execute` writes the actual production code changes directly into the target project and runs its test commands via Bash by invoking `run-regression` — and, like `plan-the-work`, it never runs `git commit` on the user's behalf either; every change it makes is left uncommitted for you to review.

Unlike skills that only read files in the current project, `find-the-repos` also reads `product.md` — and, for a purely technical ticket, `architecture.md` — from sibling repos elsewhere in the workspace. It writes only its own `make-it-work/<TICKET>/<TICKET>-repos.md` artifact; it never modifies any repo's code or docs.

`implement` changes the target project only through the stages it runs — `plan-the-work`'s uncommitted test files, `execute`'s uncommitted implementation — plus its own final context sync, which writes the project's skills and `.claude/rules` files directly. `close-the-gaps` and `plan-the-work` may also write those files directly at the end of a run, but only to record facts about the system as it already is, never the ticket's planned behavior.

Issue-tracker access is not included in this plugin. Looking up a ticket by ID requires a separate integration that you install and authorize; pasting the ticket content requires no issue-tracker connection.

Pipeline artifacts under `make-it-work/<TICKET>/`—including specs, plans, handoffs, verification ledgers, review reports, final packages, delivery progress, and status dashboards—are working documents, not deliverables. Add `make-it-work/` to your project's `.gitignore` so they're never committed by accident. If a project was onboarded with `go-deep`, its generated `CLAUDE.md` also reminds Claude to flag a ticket's stale artifacts for deletion right after that ticket's code is committed. The cumulative `make-it-work/implement-feedback.md` file is also uncommitted working data, but it is not ticket-scoped: keep it when deleting a ticket directory if you intend to review or manually share the workflow feedback.

## Troubleshooting

- **A skill is not available:** run `/reload-plugins` or restart Claude Code, then confirm the plugin is enabled with `/plugin`.
- **Claude Code loads an older version:** update both the marketplace and the plugin using the commands above, then reload plugins.
- **A ticket ID cannot be found:** configure an issue-tracker integration or invoke `close-the-gaps` without an ID and paste the ticket content.
- **An offline questions file is stuck pending:** re-invoke `close-the-gaps` with that file's path to inject the answers and resume, or invoke the ticket again and choose to overwrite it and start fresh.
- **`plan-the-work` cannot find a refined spec:** pass an explicit spec path or run `close-the-gaps TICKET-123` first to create `make-it-work/TICKET-123/TICKET-123-spec.md`.
- **`review-the-pr` cannot find project guidance:** run `go-deep` first, or confirm the repository contains the expected `CLAUDE.md`, `.claude/rules`, and domain/use-case skills.
- **`implement` says the project context is incomplete:** run `/make-it-work:go-deep` and choose its "Repair existing docs" mode, then run `implement` again.
- **`implement` stopped mid-run:** read the stop reason in chat, in `make-it-work/<TICKET>/<TICKET>-state.md` (`pause_reason`), or in `make-it-work/<TICKET>/<TICKET>-status.html`'s "Waiting on you" section, address it, and run `implement` again — it resumes from the saved phase.
- **The plugin is installed twice:** remove or disable one copy in `/plugin` and keep the marketplace channel you want to follow.

If the problem persists, [open a GitHub issue](https://github.com/insideout-ai/make-it-work/issues) with your Claude Code version, installation channel, and the relevant error message.

See [SUPPORT.md](SUPPORT.md) for support and feature-request guidance. Report suspected vulnerabilities privately by following [SECURITY.md](SECURITY.md).

## Development

Validate the manifest, bundled skills, and marketplace entry before opening a pull request:

```sh
claude plugin validate .claude-plugin/plugin.json --strict
claude plugin validate skills --strict
claude plugin validate .claude-plugin/marketplace.json --strict
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for local testing and pull-request guidance.

---

Built by [insideout-ai](https://github.com/insideout-ai)
