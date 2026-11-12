# Discuss and recommend a testing strategy

Use after DTS has inspected the confirmed test locations. The goal is a repo-specific approach the user understands and can adjust, with a practical adoption order. Existing tools and explicit project/user choices are constraints. A missing suite does not imply that unit tests alone are sufficient, nor that every possible layer is needed.

## Start with evidence and a recommendation

Inspect runtime/build configuration, architecture, dependency boundaries, important use cases and existing tests. Cite relevant repo paths. Without go-deep, use available code/docs and mark missing product context rather than inventing use-case IDs. Explain the main risks and recommend the smallest useful combination of layers that exercises them. Compare an alternative only when it changes confidence, maintenance, speed, or environment requirements materially.

Distinguish **current coverage**, **recommended target coverage**, and **the first adoption phase** before prioritizing individual tests. Current tooling describes what exists; the target follows from risks; the first phase is a feasible subset with its remaining blind spots stated. A unit-first phase must not silently become a unit-only target. A runner is not a test layer: keeping an established runner does not rule out component or integration coverage with appropriate setup. Multiple layers are not mandatory when the repo's risks do not justify them.

Cover these decisions where relevant; this is a discussion guide, not a questionnaire to ask verbatim:

| Area | Recommendation to develop |
| --- | --- |
| Layers | Consider unit, component, integration, contract and end-to-end tests against actual risks. Explain what belongs in each selected layer and what is deferred or unnecessary. Consider performance, security or accessibility checks when product risks or requirements justify them. |
| Approach and boundaries | Which behavior to test through public interfaces; what to isolate or mock; where real databases, local services, sandboxes or consumer/provider contracts provide necessary confidence. Explain the blind spots of substitutes. |
| Coverage priorities | Important user journeys, business rules, negative paths and regression risks. For a ticket, start with changed behavior. Recommend observable outcomes rather than blanket coverage percentages or fixed layer ratios. |
| Tools and structure | Retain established runners; propose additions only for demonstrated missing capabilities. Recommend directories, naming, fixtures, deterministic test data, cleanup and service lifecycle where needed. |
| Execution and maintenance | Fast local feedback, proposed PR checks versus slower scheduled suites, required services/credentials, and practical runtime constraints. Address isolation and flaky tests when relevant; do not invent measured timings or fix flakiness with unconditional retries. |
| Adoption | First real behavior tests, then subsequent capabilities in priority order. For each first test, name its layer, behavior, expected observation and required environment. State what is deferred and what would justify adding it. |

For example, a database-backed API may benefit most from integration tests of persistence and request behavior, unit tests of isolated rules, and a small end-to-end smoke suite. A pure library may need only unit/property tests initially. A UI may need component behavior tests plus a few browser journeys. These illustrate reasoning, not mandatory bundles or tool selections.

Missing runtimes, services, credentials or test libraries are prerequisites to discuss, not sufficient reasons to exclude a valuable layer from the target. Compare relevant options such as installing a runtime locally, running tests in CI, using a supported sandbox, or isolating external boundaries; explain what each verifies and misses. Verify claimed platform restrictions from repo evidence. When access is unresolved, keep dependent coverage conditional and ask about feasible setup. For deferred coverage, state the reason, remaining risk, and concrete condition for revisiting it. Describe unperformed manual checks as planned/manual coverage still needing execution, never as already verified.

Keep production refactoring separate from tooling setup. If testability appears to require extracting logic, name the proposed production change and why, and surface it as an implementation prerequisite requiring its own decision. Do not assume extraction is acceptable, perform it during DTS, or propose duplicating business logic into a testable copy as the default workaround for runtime or code-sharing constraints. Tests should exercise the production implementation; tests of a detached copy cannot establish that the deployed path behaves correctly.

## Discuss choices the repo cannot answer

Present the recommendation before asking the user to choose. Ask one material question at a time, adapting to each answer. Give 2–3 concrete choices with tradeoffs, put `(Recommended)` on the first option, and allow a free-text correction. Choose the next question from unresolved decisions rather than walking a fixed checklist.

Useful questions concern which workflows matter most, acceptable environment/setup cost, availability of a local database or sandbox, or the desired balance of feedback speed and broader confidence. Resolve consequential target/layer and environment choices before narrow questions about which unit tests come first. A priority answer does not imply agreement to omit other layers or refactor production code. Do not make the user choose a framework without a recommendation, ask about facts already discoverable, bundle independent questions, or repeat a recorded preference. If the supplied context resolves all material choices, present the recommendation and go straight to confirmation.

Example after inspecting a transactional API:

> The main risks are persistence and API behavior. I recommend integration tests with a real local database, unit tests for isolated rules, and a small smoke suite later. Can the team run a disposable database locally and in CI?

Possible options: `Local database + CI (Recommended)` (strong persistence coverage with setup cost), `CI database only` (lighter local setup, slower feedback), or `Isolated tests initially` (quick start with persistence checks explicitly deferred). Tailor the recommendation to evidence; do not recommend a local service when project constraints prohibit one.

Update the recommendation from the answer. Do not treat a preference for a small initial effort as permission to drop critical risks silently. Explain remaining blind spots and the next useful step. End with the `strategy-confirm` checkpoint: current coverage, recommended target, selected first phase and tests, boundaries, execution approach, deferred risks/revisit conditions, and any assumptions or production prerequisites. In interactive mode wait for confirmation or correction before proceeding; the earlier answers should make this a concise summary.

## Defaults and caller context

In Autopilot, construct the same questions/options, select evidence-based recommendations without waiting, and log each reached site through DTS's existing writer. Unverified service access, product priorities or team capacity remain assumptions, not facts. Choose a feasible starting point under known constraints and leave dependent capabilities conditional when access is unknown; retain their value in the target rather than collapsing it into currently runnable layers. Do not infer approval for production refactoring. Mark defaults as `autopilot default` and unknowns as `assumption` in the saved strategy; never describe them as user agreement. A default must not replace a prior explicit choice. If writing the log is denied, keep these labels in the generated document and follow DTS's existing denied-log behavior.

When called by `implement`, keep the discussion proportional to the ticket and reuse prior answers and readiness decisions. Follow the caller's autonomy as specified in DTS. Do not repeat a completed discussion when refreshing after setup, broaden setup beyond the selected scope, or reopen an explicitly selected manual verification policy. Strategy agreement is documentation, not authorization to install dependencies or alter verification gates.

## Save the result

Under `## Strategy Decisions`, record:

- Evidence and important risks, with current coverage, recommended target layers and the selected first adoption phase clearly distinguished; give rationale and configured/proposed status.
- The testing approach: public interfaces, mocked versus real boundaries, fixtures/data, and the intended local/CI execution split.
- A concise decision table (`Decision | Choice and rationale | Source`) for material choices. Sources are user, project policy (with path), repo evidence, autopilot default, autonomous default, or assumption. Preserve the origin of earlier decisions; an overall confirmation does not verify assumed access.
- First behavior tests and expected observations in adoption order, deferred work with remaining risks and the conditions for revisiting it, unresolved assumptions, and any proposed production refactoring kept separate from test tooling changes.

Project every configured or selected layer into Layers and Where New Tests Go using the template's `configured`, `planned` or `deferred` Status. Preserve who selected it in the decision table. Record the intended destination/naming even when its directory does not exist; use `TBD` for unresolved placement. Map relevant changes to selected layers in Coverage Decision Guidance with missing setup or deferral conditions. A selected component layer must not disappear from those sections merely because only unit tooling is currently configured. Unselected alternatives remain narrative recommendations.

This is the chosen direction, not a stored coverage-gap report. Keep the live uncovered-token list in Phase 7 only. Under Recommended Setup, put actionable proposed tools/config/scripts and commands for absent or missing capabilities. If a setup already exists, propose only justified additions and keep its current runner. Test Locations and runnable commands describe actual configuration; planned/deferred layer rows have Example command `none`. Label all unconfigured capabilities and setup commands as proposed and unverified, even after the user agrees to them. When there are no setup changes to propose, omit that section.
