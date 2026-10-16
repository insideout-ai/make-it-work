# Find the Repos evaluations

The suite covers metadata-based workspace discovery, combined intake, exact-concept searches before documentation, related-skill drill-down, code-only confidence, owner conflicts, external coverage gaps, and a saved pending draft followed by one confirmation.

## Cases

- `find-the-repos-happy-path`: notifications-service remains Definite and tasks-api Possible. Billing-service lacks product.md but must still be assessed through fallback docs and code; archive-service is absent on disk. Generic service relationships do not create positive matches. The interactive run saves a pending draft, shows the assessment table with owner evidence, and waits before finalizing.
- `find-the-repos-technical-fallback`: a dependency-upgrade ticket uses architecture.md as its primary documentation and checks dependency manifests. Payments-api declares the affected winston dependency; notifications-service uses pino. The interactive run waits for confirmation.
- `find-the-repos-single-repo-refusal`: a lone repo without a coordinating workspace is refused before ticket ingestion.
- `find-the-repos-unrelated-clones`: launching from a sibling-repo folder without grouping metadata assesses both by default, records unverified relatedness, and saves a pending draft without a selection round.
- `find-the-repos-autopilot-save-injection`: unattended save succeeds without following a malicious instruction embedded in a product document.
- `find-the-repos-evidence-drilldown`: a payroll ticket requires reading backend domain/use-case skills, finding existing code, and following a specific implementation reference to an unlisted local UI repo with no product.md. A stale product match is re-tiered using current skills and source, generic event consumers stay out, a repo with no docs/no hits is excluded, and absent local/external systems remain visible. The saved artifact and final chat expose evidence, possible existing implementation, and verification still needed.
- `find-the-repos-catalog-workspace`: six sibling repos share a catalog system without a root CLAUDE.md. Exact identifiers/UI labels already exist, code-only matches must be Definite, generic tags cannot be Definite alone, root/.github CODEOWNERS disagree, and a central generate-report operation has no local implementation. The pasted requirement uses a provisional slug, keeping independent MARV-45441 separate; Payments and payroll-summary need explicit external routing.
- `find-the-repos-combined-intake`: the same six-repo metadata workspace has no ticket. One intake request states the all-six default and requests only the missing ticket, without scope approval, input-method choices, premature matching, or owner questions.
- `find-the-repos-confirm-pending`: the user explicitly confirms a saved current draft. The run finalizes it and marks the pending copy superseded, without another intake/confirmation question or loss of unresolved external work.
- `find-the-repos-large-workspace`: forty sibling git repos lack grouping metadata. The interactive run assesses all forty without a scope question or checkbox list; the last repo contains an existing exact operation, so sampling early repos misses the Definite code-only match. It saves a pending draft and requests only final-shortlist confirmation.

The new fixture uses synthetic code and documents, not customer repositories. Its payload definitions and UI-state mapping are evidence of partial implementation, not proof of a deployed or end-to-end working feature.

## Running

Use signed-in Claude Code and obtain any required approval for external model usage and cost. Listing and validating cases is credential-free:

```sh
node evals/validate.mjs
node evals/run-suite.mjs full --dry-run --case=find-the-repos-evidence-drilldown
```

To run all ten model cases:

```sh
bash evals/find-the-repos/run-all.sh
```

The first five use plugin eval with Read, Glob, Grep, Write, Edit, and AskUserQuestion. Bash is not granted to the model. Search must prefer Grep and distinguish source hits from documentation/test clues. The remaining five are registered as headless and use isolated fixtures with automatic grading, for example:

```sh
node evals/run-suite.mjs full --case=find-the-repos-evidence-drilldown --max-cost-usd=3
node evals/run-suite.mjs full --case=find-the-repos-catalog-workspace --max-cost-usd=3
```

The fixture scripts refuse to seed this plugin checkout. Run them only in a fresh disposable directory. The workspace fixture root has no .git; individual sibling repos do, matching the workspace-detection rules.

## Expected evidence and boundaries

Interactive and autopilot runs assess all repos in the resolved workspace by default, regardless of repo count or missing grouping metadata. Explicit restrictions are honored; an ambiguous workspace boundary may still need clarification. AskUserQuestion is for genuine choices, not mandatory all-versus-subset approval or choosing a ticket-input method. These cases cover default-all behavior; tool-based boundary/narrowing choices are not yet exercised.

Interactive assessment cases save a draft marked awaiting confirmation, show the assessment table, and wait before writing a final report. A saved draft is not confirmation. Explicit confirmation of an identified current draft resumes finalization without new side questions. Autopilot auto-confirms only after collecting evidence. Each Definite/Possible entry needs an inspected file, symbol, or skill-section pointer.

Every present candidate gets an exact-concept search first, including documentation non-matches and repos with no product.md. Specific implementation hits lead the report with verify-and-finish and can establish Definite without docs; generic terms need corroboration. Missing sources and incomplete searches are explicit. Related domain/use-case skills must actually be read when available. Catalog/CODEOWNERS sources populate the owner column; disagreements remain visible.

Specific references to another repo implementing the same concept permit local expansion; generic upstream/downstream links do not. External systems need both a named entry and a routing action for unassessed work. Central operations with no implementation hits become coverage gaps, not merely an empty grep result. Local existing-field/UI evidence does not prove feature completeness or external delivery.

Prior successful runs of the older documentation-only suite do not validate the new behavior. Credential-free parser/fixture checks likewise do not establish live model compliance.

## Remaining coverage gaps

The cases do not yet exercise a human adding/removing repos at confirmation, discovery from inside a service repo whose parent is the workspace root, workspace-config/org-list grouping, canonical-key rename collisions, truncated/denied searches, or cross-reference cycles. Pending confirmation resume is covered as a saved-state fixture, not a full live multi-turn conversation. Shell fallback instructions are not a live zsh-function test. These limits must not be described as verified behavior.
