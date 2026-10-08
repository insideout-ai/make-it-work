---
name: deliver
description: "Optionally commit, push, and open or update a PR for a completed make-it-work implement run. Requires a current final package and a separate, explicit delivery approval. Never merges or posts to Jira."
disable-model-invocation: true
---

# Deliver

Use only when the developer explicitly asks to deliver a completed `implement` run. This is a separate command; finishing or approving `implement` does **not** authorize delivery. Do not invoke from `implement`, Autonomous, or Autopilot.

Usage: `/make-it-work:deliver <TICKET>`.

1. Locate the completed `make-it-work/<TICKET>-state.md` and the artifact root. Read the final package and its Markdown preview. Delivery is available only for package-enabled runs. Do not create a package here or alter its approved content.
2. Run `node "<base>/../implement/scripts/deliver.mjs" prepare --root <artifact-root> --state <state-path>`. The helper verifies that the final package still matches the source tree and evidence; Guided runs must have their package approval. It writes `make-it-work/<TICKET>-delivery-plan.md` and a JSON plan, returning the plan hash. If it fails, stop and show the specific blocker. Do not work around a stale package by committing manually.
3. Show the **entire** delivery preview to the developer, including each repo, origin, source and base branches, paths, full commit message, and full PR title/description. Ask **Deliver this exact plan** / **Stop**. This is a new approval, distinct from final-package approval. Never infer it from an earlier answer. No automatic/default selection, even in an Autonomous or Autopilot run.
4. Only after an explicit **Deliver this exact plan** response, call `node "<base>/../implement/scripts/deliver.mjs" run --root <artifact-root> --state <state-path> --hash <shown-plan-hash>`. Report commit hashes and PR URLs from its result. On error, do not retry automatically; show the error and the progress file path. A subsequent explicit user request may rerun the same plan after the blocker is fixed. Use `status` to inspect partial progress.

The delivery helper stages only package paths, checks the resulting tree, runs commit hooks, pushes to `origin` without force, and creates or updates a PR. If a hook changes the approved tree, it stops before pushing that repo. It records per-repo progress under `make-it-work/` so a retry does not repeat successful work. It supports GitHub (`gh` CLI authenticated separately) and Bitbucket Cloud (`MAKE_IT_WORK_BITBUCKET_TOKEN_JSON` supplied out of band); unsupported remotes stop. Do not ask the developer to paste credentials into chat. It refuses common sensitive file paths and never merges or posts to Jira.
