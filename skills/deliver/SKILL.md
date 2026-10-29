---
name: deliver
description: "Optionally commit, push, and open or update a PR for a completed make-it-work implement run. Requires a current final package and a separate, explicit delivery approval. Never merges or posts to Jira."
disable-model-invocation: true
---

# Deliver

Use only when the developer explicitly asks to deliver a completed `implement` run. `implement` may offer this as its final optional next step, but finishing or approving `implement` does **not** authorize delivery. Never start delivery automatically from `implement`, Autonomous, or Autopilot; an explicit developer opt-in is required first.

Selecting **Prepare delivery** in `implement` satisfies that explicit opt-in requirement. Continue by reading and following this skill inline in the same session, without requiring a separate `/deliver` command, a Skill-tool invocation, or another preparation-permission question. A recorded opt-in remains effective if preparation continues after an interruption. The selection authorizes preparing and displaying the preview only; commit, push, and PR actions still require **Deliver this exact plan** for the plan shown below. `disable-model-invocation: true` preserves explicit command entry and does not prohibit this authorized inline continuation.

Usage: `/make-it-work:deliver <TICKET>`.

Follow [the workflow-decision audit contract](../implement/references/workflow-decisions.md): record explicit delivery opt-in (unless already recorded by `implement`), Stop, exact-plan approval and retry requests in the completed run's Audit log using `dashboard-checkpoint.mjs decision` with `resume: transparent`. Record before the dependent delivery command, referencing the shown plan hash for approval. Preserve implementation completion and its timing; the delivery journal remains authoritative for operations and approval. Silence supplies no decision.

1. Locate the completed `make-it-work/<TICKET>/<TICKET>-state.md` and the artifact root. Read the final package and its Markdown preview. Delivery is available only for package-enabled runs. Do not create a package here or alter its approved content.
2. Run `node "<base>/../implement/scripts/deliver.mjs" prepare --root <artifact-root> --state <state-path>`. The helper verifies that the final package still matches the source tree and evidence; Guided runs must have their package approval. It writes `make-it-work/<TICKET>/<TICKET>-delivery-plan.md` and a JSON plan, returning the plan hash. If it fails, stop and show the specific blocker. Do not work around a stale package by committing manually.
3. Show the **entire** delivery preview to the developer, including each repo, origin, source and base branches, paths, full commit message, and full PR title/description. Ask **Deliver this exact plan** / **Stop**. This is a new approval, distinct from final-package approval. Never infer it from an earlier answer. No automatic/default selection, even in an Autonomous or Autopilot run.
   - **Stop** → run `node "<base>/../implement/scripts/deliver.mjs" decline --root <artifact-root> --state <state-path>` to record that delivery was declined and refresh its dashboard status. Silence is not a decline or approval.
4. Only after an explicit **Deliver this exact plan** response, call `node "<base>/../implement/scripts/deliver.mjs" run --root <artifact-root> --state <state-path> --hash <shown-plan-hash>`. Report commit hashes and PR URLs from its result. On error, do not retry automatically; show the error and the progress file path. A subsequent explicit user request may rerun the same plan after the blocker is fixed. Use `status` to inspect partial progress.

The delivery helper stages only package paths, checks the resulting tree, runs commit hooks, pushes to `origin` without force, and creates or updates a PR. If a hook changes the approved tree, it stops before pushing that repo. It records per-repo progress under `make-it-work/` so a retry does not repeat successful work. It supports GitHub (`gh` CLI authenticated separately) and Bitbucket Cloud (`MAKE_IT_WORK_BITBUCKET_TOKEN_JSON` supplied out of band); unsupported remotes stop. Do not ask the developer to paste credentials into chat. It refuses common sensitive file paths and never merges or posts to Jira.

The helper also checkpoints the existing status HTML from its delivery journal after preparation, approval/start, every commit/push/PR, and terminal success or failure. Implementation stays `Complete`; delivery has its own status, timestamps, activity and per-repo results. A failed delivery may already have committed or pushed some repos: report the actual journal rather than claiming changes remain uncommitted. Dashboard failure saves delivery progress and stops further actions; repair rendering before an explicitly requested retry. Do not hand-edit HTML or create a dashboard for a legacy run that has none.

Already completed deliveries with older version-1 journals are supported: regenerating the dashboard with `dashboard-checkpoint.mjs render --state <state-path>` reads their delivery plan and per-repo results without repeating delivery. An already-open page generated before this integration needs one browser reload after regeneration. New dashboards keep refreshing through the delivery choice, approval and running states, and stop refreshing when delivery is declined, fails, or completes.
