# Shape the Epic evaluations

The suite covers mode/focus selection, the discovery interview, direct epic generation after the interview, unattended logging, and outcome-focused technical-debt content. The post-interview category-draft approval phase is removed; the interview remains part of the normal workflow.

## Cases

- `shape-the-epic-rich-input-autopilot`: detailed Product context resolves selection and discovery unattended, then produces the full epic without section approvals. Existing answers can make discovery exit early. Product permissions, metrics, Gherkin criteria, and the supplied rollout decision are preserved.
- `shape-the-epic-sparse-input-autopilot`: vague Product context exercises bounded discovery and produces a complete draft with meaningful unknowns and provisional interpretations visible instead of invented facts.
- `shape-the-epic-negative-control`: without `--autopilot`, the run asks for the missing mode/focus choice or discovery input and waits. It must not bypass the interview, generate an epic yet, or create an autopilot audit log.
- `shape-the-epic-technical-debt-outcomes`: a supplied completed interview and review scope lead directly to normal epic generation without another interview or category-approval round. Three outcomes, a material privacy constraint, and an explicit approval criterion are preserved. The case rejects inferred responsibility, incidental-tool dependencies, and candidate implementation designs.
- `shape-the-epic-technical-debt-sparse`: qualitative CI-delay evidence goes through unattended discovery and produces a draft with scoped measurement TBDs. The case rejects invented metrics, ownership questions, implementation plans, and optional-section readiness blockers.
- `shape-the-epic-discovery-interview`: a normal run with mode and focus already supplied asks one relevant discovery question and waits, without requiring an explicit interview opt-in or another selection step.
- `shape-the-epic-jira-full-description`: a saved epic and an explicit Jira update request prepare the complete description locally without repeating shaping. Checks that the entire Decision log, its four decision/rationale/status rows, and all other epic content survive, while the separate JSONL audit stays local. The fixture prohibits live tracker calls.

Autopilot discovery retains its six-open-text-turn cap and exit summary. Only the category-draft approval graders have been retired. Content readiness is distinct from human approval. An empty autopilot log is valid only when supplied mode, focus, and interview context already resolved every site.

## Running

Use an existing signed-in Claude Code installation. Check `claude auth status` first; model evaluation is unavailable when the shell is signed out.

Run all seven cases sequentially:

```sh
bash evals/shape-the-epic/run-all.sh
```

The per-skill script uses disposable headless runs for the technical-debt and discovery cases, and the existing plain plugin-eval path for the Product cases. It runs every case even after a failure. For a single case, use the shared runner:

```sh
node evals/run-suite.mjs full --case=shape-the-epic-technical-debt-outcomes --max-cost-usd=3
node evals/run-suite.mjs smoke --case=shape-the-epic-rich-input-autopilot --max-cost-usd=3
node evals/run-suite.mjs full --case=shape-the-epic-jira-full-description --max-cost-usd=3
```

The shared smoke suite uses a disposable headless run for the rich Product case because its epic write was denied in a previous plain plugin-eval run despite the Write grant. The new cases are also registered as headless. Reports include the transcript, fixture location, and grader verdicts under ignored `evals/results/`. Never treat a denied artifact write as a successful draft.

Shaping cases grant Write, Edit, Read, and AskUserQuestion; the Jira description-preparation case grants only Read and Write. Autopilot resolves selection and discovery without invoking AskUserQuestion. Normal interview cases ask the user and wait; the completed-interview case reuses the supplied answers and proceeds to drafting. No case grants Bash or bypasses tool permissions.

## Artifact and logging checks

The filename includes a timestamp, so graders inspect the successful Write result and its content rather than assuming a fixed path. Ignore denied attempts when judging the saved epic. Numeric collision suffixes are allowed.

Autopilot saves the epic before attempting `make-it-work/shape-the-epic-autopilot-log.jsonl`. A denied log write is non-fatal and must not trigger retries through other tools or paths. Log entries follow the shared schema and describe actual automatic resolutions of mode selection, category selection, and discovery/gap-check questions. Category-selection entries use multiSelect with chosen-label arrays. There are no category-draft approval entries.

To inspect actual log files outside the plugin-eval sandbox, the existing helper runs in its own disposable directory:

```sh
cd /private/tmp
bash /absolute/path/to/make-it-work/evals/shape-the-epic/manual-log-check.sh rich
bash /absolute/path/to/make-it-work/evals/shape-the-epic/manual-log-check.sh sparse
```

Replace the absolute checkout path. The helper refuses to run from the plugin checkout, grants only the listed tools, and compares repository status before and after. These commands do not require permission-bypass flags. Do not claim a live evaluation was run based only on credential-free validation.

## Interpreting results

Inspect the successful saved artifact and transcript when an LLM grader fails. Prior runs showed judge variance on long traces and occasional plugin-loading failures; those findings do not establish that the revised workflow passes. The current cases must be rerun against the changed instructions.

The suite covers interview entry and a supplied completed-interview handoff, but not a full multi-turn live interview or consolidated revision. It does not yet exercise collision handling, an explicitly requested design appendix, or backlog identifiers requested by the user.

The Jira regression checks local description preparation only. It does not validate a live Jira write, formatting conversion by a connector, or the required remote read-back; those need a disposable tracker integration.
