# Commercial licensing migration record

Status: **Final agreement and commercial publication authorized for 2026-11-03**.
Initial audit: 2026-11-01. Consolidation and remote recheck: 2026-11-03.
Original preparation branch: `chore/commercial-annual-licensing` (PR #75, merged).
Release branch: `release/commercial-5.0.0`. The maintainer subsequently authorized
the remaining publication steps; see the publication authorization below.

## Audit findings (before implementation)

- Audited base: `8d57b84fd0df8a99960bd29c2d2e1465f04ad7ea`, plugin version
  `4.19.2`; remote `main` and remote HEAD matched this commit at audit time.
- Root LICENSE was PolyForm Internal Use License 1.0.0, copyright 2026
  InsideOut AI. It permits internal business use and internal changes, prohibits
  distribution and sublicensing, and has no 30-day or annual payment requirement.
- All explicit PolyForm references in tracked files were in `LICENSE`,
  `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and the inbound
  contribution sentence in `CONTRIBUTING.md`. README, SUPPORT, and CHANGELOG had
  no explicit PolyForm references. They did not explain annual licensing.
- Both manifests used `PolyForm-Internal-Use-1.0.0`. Plugin identity is
  `make-it-work`, marketplace is `insideout-ai`, source is the GitHub repository
  without a pinned ref. Default-branch changes can affect marketplace consumers;
  publishing this branch to main must wait for release approval.
- LICENSE history: original MIT at
  `072dce0eb673b2c0cbabd6045b2326098fb63b26`; changed to PolyForm at
  `a47b5a808e324108e8395b89deaeedf9a8db09d3` (2026-09-30).
- Remote tags and GitHub releases, verified read-only with `gh release list`
  and `git ls-remote --tags origin`:

| Release | Commit | Published (UTC) | License in snapshot |
| --- | --- | --- | --- |
| v2.0.0 | `9dbdf988745344cc09297722026bb109f5dd0216` | 2026-09-18 17:40:49 | MIT |
| v2.1.0 (GitHub latest) | `6b2bd77bb602540a5b5c6bbaf1f18d481ee691ac` | 2026-09-18 18:29:18 | MIT |

There is **no published PolyForm release/tag** in this inventory. The latest
PolyForm snapshot is 4.19.2 at the audited base, not an existing GitHub release.
This boundary must be rechecked immediately before the eventual transition if
main advances. Existing tags must remain untouched.

### Ownership and third-party review

`git shortlog -sne HEAD` shows 166 commits under Erez Morabia/erezmorabia and
81 under Yael Morabia (Rabinovitz). All-ref author inspection additionally shows
`git-ai <git-ai@local>`; commit trailers credit Claude models. Those entries are
provenance signals, not proof of ownership or rights clearance. The maintainer
subsequently confirmed that Yael Morabia (Rabinovitz) is his partner in InsideOut
AI, and confirmed her agreement to the proposed commercial licensing model in
response to whether Erez Morabia trading as InsideOut AI may commercially license
her contributions. This is the maintainer's representation of her consent; the
audit did not establish an ownership assignment or review a separate signed
agreement. No CLA, assignment, DCO agreement, or
third-party NOTICE was found in tracked files. The prior contribution policy supplied contributions under PolyForm;
that alone does not establish permission to relicense others' contributions
under this commercial agreement.

The shipped product is Markdown skills and JavaScript helpers. Tracked package
manifests are eval fixtures; there is no root package dependency manifest,
vendor directory, or submodule declaration. Helper imports inspected use Node
built-ins and local modules. An import scan also found `pg` in
`evals/define-test-strategy/strategy-api-autopilot/fixture/src/server.mjs`, an
eval fixture rather than a shipped plugin runtime dependency. CI consumes third-party GitHub Actions and installs
Claude Code separately. These observations do not prove every snippet, template,
fixture, or generated contribution is owned by InsideOut AI. A human provenance
review must confirm copied/adapted material, AI service terms at creation time,
required notices, and any third-party obligations, including the earlier MIT
notice where applicable. Archived old texts are historical records, not a grant
to apply those licenses to all future code.

The maintainer subsequently supplied ownership, partner-permission, and provenance
confirmations, recorded below. They are not independent legal verification or a
signed assignment. All requested business decisions are settled, and the maintainer subsequently
approved the final agreement and removal of draft labels on 2026-11-03. Release
execution remains pending; no independent external legal opinion is implied.

### Hosting and marketplace requirements

[GitHub Terms D.4–D.6](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
require hosting and public view/fork rights, and address inbound contributions.
A blanket ban on all copying/forking would conflict with public hosting. The
agreement preserves platform rights while restricting redistribution outside them.
Counsel must confirm this treatment and the applicable account agreement.

[Claude manifest documentation](https://code.claude.com/docs/en/plugins-reference)
defines `license` as a string for an SPDX identifier.
[SPDX expressions](https://spdx.github.io/spdx-spec/v2.3.1/SPDX-license-expressions/)
permit a user-defined `LicenseRef-…`. Both manifests now use
`LicenseRef-Make-It-Work-Commercial-1.0`, mapped to root [LICENSE](../../LICENSE).
This is a custom reference, not a listed SPDX license or OSI approval. No
unsupported `licenseUrl` or payment fields were added. The CLI validator results
are recorded below; schema acceptance does not constitute marketplace commercial
policy approval.

[Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference)
allows matching license display fields in plugin entries and sources pinned by
ref/SHA. [Publishing guidance](https://code.claude.com/docs/en/plugins/publish)
describes separate directory submission. These pages do not establish that any
specific third-party catalog accepts these paid terms. On 2026-11-03, the public
[Anthropic community catalog](https://github.com/anthropics/claude-plugins-community/blob/main/.claude-plugin/marketplace.json)
identified Anthropic as operator and pinned Make It Work to commit
`aac589f62e2eded9333767a0490c0a1b1751cd0e`. Its local historical tree contains
MIT-licensed plugin version 1.0.0. Commercial-license acceptance and caching or
redistribution requirements for future updates remain unconfirmed. The maintainer
approved leaving this catalog untouched and deferring its commercial update.
Obtain operator confirmation before requesting such an update. The self-hosted
InsideOut marketplace needs no new runtime field for a legal subscription, but
installation UI acceptance and notice need review before commercial launch.
No live catalog was edited, submitted, or installed during this task.

## Old and proposed new licensing

| Topic | Audited PolyForm versions | Future approved commercial versions |
| --- | --- | --- |
| Duration | Original terms, no annual subscription | One organization trial of 30 days, then renewable 12-month subscription |
| Users | Original definition of your company | Unlimited employees/authorized contractors in named organization; affiliates only if ordered |
| Scope | Internal business use and modifications | Unlimited internal repositories/installations and internal modifications |
| Updates | No subscription maintenance entitlement | Generally available updates, improvements, bug fixes and maintenance while subscribed; no SLA |
| Distribution | Original restrictions | No resale, redistribution, sublicensing, or plugin hosting service, subject to platform/third-party rights |
| Customer work | Original rights | Customer retains own code, requirements, documents and generated artifacts after expiration |

Earlier MIT versions also retain their MIT rights. No prior rights are revoked.
Only a separately identified future release will carry the approved commercial
terms. This branch bumps the plugin manifest from 4.19.2 to 5.0.0 for the proposed transition. Version 5.0.0 is the first expressly designated commercial release, dated 2026-11-03.

## Preserve and access the PolyForm snapshot

[Original tree](https://github.com/insideout-ai/make-it-work/tree/8d57b84fd0df8a99960bd29c2d2e1465f04ad7ea)
and [original LICENSE](https://github.com/insideout-ai/make-it-work/blob/8d57b84fd0df8a99960bd29c2d2e1465f04ad7ea/LICENSE)
are accessible by commit. Archived verbatim texts:
[PolyForm](POLYFORM-INTERNAL-USE-1.0.0.txt), [MIT](MIT.txt).

Suggested version-specific tag: `v4.19.2-polyform`. The audit found it absent
locally and remotely. Exact proposed creation command (not executed):

```sh
git tag -a v4.19.2-polyform 8d57b84fd0df8a99960bd29c2d2e1465f04ad7ea -m "Make It Work 4.19.2 — PolyForm Internal Use License 1.0.0 snapshot"
```

Recheck the target, version, license, and tag absence before creating it. The
command uses no force flag and must fail if the local tag already exists.
Publishing the tag or an associated historical release requires explicit user
approval; never overwrite a remote tag. The existing MIT tags need no changes.

Users can pin the historical commit without waiting for a tag:

```sh
git clone https://github.com/insideout-ai/make-it-work.git make-it-work-polyform
cd make-it-work-polyform
git switch --detach 8d57b84fd0df8a99960bd29c2d2e1465f04ad7ea
cat LICENSE
claude --plugin-dir .
```

Select one installed copy in Claude Code to avoid duplicate workflows. Staying
on the old snapshot does not entitle users to subsequent commercial updates.

## Confirmed business decisions

All decisions below were explicitly confirmed by the maintainer during review.
The former detailed question log is consolidated here; these are settled
business choices rather than further questions to repeat. The final distribution
choice was explicitly approved: publisher-only commercial launch, with the
existing external MIT listing unchanged and commercial updates there deferred.

| Topic | Confirmed decision |
| --- | --- |
| Licensor and brand | Erez Morabia, trading as InsideOut AI. InsideOut AI remains the plugin author/brand. |
| Contact | insideoutaitech@gmail.com for licensing, renewal, and contractual notices. |
| Public geography | No country or court selected in public terms. Paid Order Forms or separate agreements must specify agreed governing law and courts. A trial without a separate agreement has no express choice. |
| Effective date | 2026-11-03, beginning with version 5.0.0. |
| Trial | Self-service, one 30-day trial per organization from first installation/execution; no registration, email approval, or credit card. Organization records the earliest date. |
| Organization scope | Unlimited employees/authorized contractors, internal repositories/installations and internal modifications; affiliates excluded unless expressly included in an Order Form. |
| Purchase | Email contact, agreed quote/Order Form, annual fee paid upfront, then written confirmation of the 12-month license and dates. No price, currency, or payment method invented. |
| Renewal and late payment | Manual renewal with annual upfront payment and written confirmation; no automatic billing/renewal or grace period. Unpaid purchases/renewals do not start or extend a term. Removed the 15-day suspension clause. |
| Refunds | No change-of-mind/non-use refund. Pro-rata unused prepaid fees refunded if Customer terminates for Licensor's material breach remaining uncured after 30 days' written notice. Required-law and separately agreed refunds preserved. |
| Warranty | As is/as available; no guarantee of error-free operation, accurate output or fitness. Express subscription obligations, refunds and non-excludable rights preserved. |
| Paid liability | Each party's ordinary contractual liability capped at fees paid/payable during the preceding 12 months. |
| Trial liability | No monetary liability for ordinary errors to the extent legally permitted, with agreed exceptions preserved. |
| Liability exceptions | Agreed fees remain payable. Fraud, deliberate misconduct, deliberate IP misuse and legally non-excludable liability are excepted from both cap and exclusions. Ordinary, unintentional contractual errors remain capped where applicable. |
| Indirect losses | Exclude indirect/consequential damages and lost profits/revenue; other direct damages subject to agreed trial/paid rules and exceptions. |
| Termination | Either party may terminate for material breach uncured 30 days after written notice. No extension of an expired trial or subscription. |
| Customer artifacts | Customer retains its own code, requirements, documents and generated work and may keep using them after expiry, subject to independently embedded materials' terms. |
| Prior versions | Preserve prior PolyForm and MIT grants; no retroactive subscription. |
| Contributions | Erez and Yael maintain code/docs. Welcome issues and suggestions; defer external patches until an inbound agreement is ready and the policy is reopened. |
| Launch channel | InsideOut AI marketplace for commercial 5.0.0. Leave community listing at its existing MIT snapshot; commercial updates there deferred until requirements confirmed and update approved. |

### Ownership and provenance confirmations

- The maintainer answered “no” when asked whether any part was developed for an
  employer or client that might hold rights.
- The maintainer identified Yael Morabia (Rabinovitz) as his InsideOut AI partner.
  Asked whether she agrees that Erez Morabia trading as InsideOut AI may
  commercially license her contributions under the proposed annual model, he
  confirmed her agreement. This records his representation; no separate signed
  consent or ownership assignment was supplied or inferred.
- The maintainer answered “no” when asked whether the repository contains code,
  skill text, templates, images or documentation copied/adapted from others'
  projects. This complements the tracked-file/import scan; it does not claim
  ownership of external tools or eval fixture dependencies.

Legal review should assess these confirmations and any required documentation,
AI-service terms and provenance, applicable historical notices, and the earlier
MIT-to-PolyForm transition. No blanket conclusion that every possible third-party
right has been independently cleared is made. A future CLA is deferred along
with external patches; CONTRIBUTING is not itself a CLA.

The geographically neutral public-license/separate-commercial-terms structure
was informed by the public [n8n Enterprise license](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md),
[Formbricks EE license](https://github.com/formbricks/formbricks/blob/main/apps/web/modules/ee/LICENSE),
and [Elastic License 2.0](https://github.com/elastic/elasticsearch/blob/main/licenses/ELASTIC-LICENSE-2.0.txt),
compared with the separate [n8n enterprise terms](https://n8n.io/legal/master-enterprise-terms/)
and [Formbricks commercial agreement](https://formbricks.com/license-agreement).
Their grants differ from this custom 30-day/annual model; they were not copied
as a substitute for legal review.

## Remaining release gates

There are **no further business-policy questions** in this migration. What remains:

1. Final approval is recorded: the maintainer approved the consolidated agreement
   and authorized removing draft labels and marking PR #75 ready for review.
   The repository audit and maintainer confirmations do not constitute an
   independent legal opinion or signed third-party consent.
2. The maintainer accepted publication despite the two earlier full-smoke
   failures. CI and focused plugin-loading smoke remain validation evidence.
   The full model eval suite and live installation rehearsal were not rerun;
   they are not represented as passed.
3. Customer-specific quotes/Order Forms must supply price, currency, payment
   details, legal organization, dates, and agreed law/courts. The
   [Order Form template](ORDER-FORM-TEMPLATE.md) is approved as a template; customer-specific completion is not a sale by itself.
4. Publication authorization is recorded below, including the historical tag,
   release merge, commercial tag/release and approved GitHub metadata. External
   catalog commercial updates remain deferred; that listing stays unchanged.

## Trial, activation, expiration, and renewal recommendation

Current enforcement is legal only. There is no trial ledger, license activation,
license-key validator, payment integration, telemetry, or trusted runtime gate.
Skills are loaded as Markdown and invoke local deterministic helpers; no universal
licensing entry point covers all skills or installation. Public source also makes
local bypass possible. A local first-run timestamp cannot establish a single
organization-wide trial or reliably survive new machines, deletion, or clock
changes. A prompt-only warning is not enforcement.

For the approved initial self-service trial, the organization records its own
earliest install/execute date and trial end. There is no mandatory registration,
email approval, credit-card collection, central trial ledger, or entitlement file.
The license notice is placed before README installation commands and requires an
authorized individual to review and accept the terms before use. This documents
the policy; it does not implement click-through acceptance or capture evidence
of assent. Legal review of this notice/acceptance approach remains a release
check. Auto-update must not silently stand in for agreement.

When an organization purchases a subscription, an optional administrative ledger
can record its identity, signed Order Form, paid term start/end, and included
affiliates. Purchase is approved as email/Order Form with annual payment upfront
and written confirmation. Renewal is manual through the same process, with no
automatic renewal or billing; completion before expiry is needed for uninterrupted
commercial-version use and maintenance. This does
not require per-developer licensing. Expiration ends rights to commercial
versions but never deletes customer work or revokes prior-license rights.

If technical checks are later commissioned, an offline signed entitlement file
and a small common checker could supply organization ID, evaluation/subscription
expiry and renewal reminders to a supported startup hook and helper entry points.
A durable organization ledger is still needed to prevent repeated trials; a
self-declared local timestamp is advisory only. Define offline behavior, clock
handling, renewal delivery, and any grace period in advance. A shared checker
would cover only paths that invoke it and would remain bypassable in public
source. Validate hook and installation behavior against supported Claude versions
before promising enforcement. No such mechanism is implemented by this change.

## Recommended GitHub configuration (prepared, not applied)

Elevated read-only checks succeeded: `visibility=PUBLIC`, `viewerPermission=ADMIN`,
license detection `Other`, description "Deep codebase context for Claude. Solid
requirements for your team. Before the first line of code.", homepage
`https://insideoutai.io/`. Normal sandbox network/auth checks failed; external
read-only access succeeded. No permissions change is needed for the checked
account, but future access must be revalidated.

The authorized repository metadata update is:

```sh
gh repo edit insideout-ai/make-it-work \
  --description "Make It Work: source-available SDLC workflows. 30-day organization evaluation, then annual commercial licensing with unlimited developers." \
  --homepage https://insideoutai.io/make-it-work \
  --add-topic source-available --add-topic commercial-license --add-topic sdlc
```

Retain existing topics: `ai`, `claude-code`, `context-engineering`,
`developer-tools`, `requirements-engineering`, `software-engineering`. Do not add
an `open-source` topic. GitHub license detection is derived from repository
content, not an editable license badge; a custom license may remain `Other`.
Keep README and LICENSE explicit. No visibility, ownership, access, protection,
security, or billing changes are proposed. Manually coordinate external listings
and the product website's pricing/acceptance flow; this repository grants no
access to those systems. No live metadata was changed during this preparation.

## First commercial release checklist

- [x] Record all maintainer business decisions and rights/provenance confirmations.
- [x] Prepare LICENSE, customer docs, Order Form template and publisher-only launch guidance.
- [x] Set plugin manifest and changelog to proposed version 5.0.0.
- [x] Confirm remote main still identifies the audited PolyForm boundary on 2026-11-03.
- [x] Identify the pinned community MIT snapshot and leave the external listing unchanged.
- [x] Obtain final maintainer approval of the agreement and remove draft labels. No independent external legal review is represented.
- [x] Confirm release/effective date as 2026-11-03.
- [x] Record the maintainer's acceptance of the two full-smoke failures for publication. Full model evals/live install rehearsal were not rerun.
- [ ] With explicit approval, publish the historical tag using the command above without rewriting history.
- [ ] With explicit approval, merge and publish v5.0.0 with legacy-rights and trial notices.
- [ ] Apply approved GitHub/website metadata and commercial enquiry guidance at launch.
- [ ] Before any later external-catalog commercial update, confirm its policies and obtain approval.

The publisher marketplace source follows the default branch. Merging can make
new code installable before a separate GitHub Release is created. Coordinate
merge, notices, and tag/release publication. Existing user rights to prior
snapshots remain intact. No live marketplace listing has been edited.

## Validation record

- Initial helper tests: 328 passed; eval-runner tests: 34 passed.
- On the version-bump delivery, all 362 tests passed again. Manifest,
  marketplace, skill, 100-case eval inventory and documentation/archive checks passed.
- CI on commit `bab04f35e68808cd2d877c93eec4b8318ffa7b50` passed the repository's
  `Validate plugin` workflow using its pinned tool versions.
- The initial sandbox smoke attempt was blocked by missing shell authentication.
  The subsequent authenticated pre-push run exercised all 13 skills: **11 passed,
  2 failed**, reported usage $4.42. Local report:
  `evals/results/smoke-2026-11-03T13-30-44-730Z/summary.json`.
- `shape-the-epic-rich-input-autopilot`: grader expected a direct Write call and
  could not verify Markdown rendered through `scripts/epic.mjs`; it also flagged
  heading capitalization.
- `slice-the-epic-well-specified-epic-autopilot`: approach preview appeared only in
  tool output; final summary differed from the saved table and omitted the exact
  recommended starting slice and linked overview.
- Those skills, helpers and graders are unchanged by this licensing branch.
  Both failures remain unresolved rather than being reported as passes. No
  out-of-scope workflow changes were made.

Consolidation checks passed: all 362 automated tests, both manifest validators,
skill validation, the 100-case eval inventory, local Markdown links, immutable
license archive bytes, approved-term consistency, neutral public wording, and
`git diff --check`. Workflow and CI files remain unchanged. The focused pre-push
smoke result is recorded in PR #75. Use `MIW_SMOKE_CASES=deliver-no-package` for
the focused pre-push run,
as permitted by CONTRIBUTING: it loads the committed plugin snapshot and tests
its stop behavior without changing product workflows. This does not replace the
required full release suite or make the previous failures pass. The missing-icon
advisory is an existing listing-asset absence; CLI validation accepts the custom
license reference. No real user marketplace installation/update was performed.

## Pull request

[PR #75](https://github.com/insideout-ai/make-it-work/pull/75), branch
`chore/commercial-annual-licensing`.

Suggested title: Prepare annual organization licensing for Make It Work 5.0.0

Description should lead with the 30-day self-service trial and annual organization
subscription, summarize the confirmed terms and preserved historical grants,
identify the maintainer's final approval and publisher-only launch, and report
all validation including unresolved full-smoke failures. No enforcement, payment
platform, workflow behavior, live metadata, public tag, release or catalog update
is included. The maintainer authorized marking the PR ready for review; merge
and release publication were subsequently authorized as recorded below.
The pre-existing untracked `output/` directory is unrelated and remains untouched.


## Final maintainer approval — 2026-11-03

After being presented with the consolidated agreement, Order Form template,
validation results, the two earlier unresolved full-smoke failures, and the fact
that no independent legal review had been performed, the maintainer replied
“I approve” to removing the draft labels and marking PR #75 ready for review.
This approval is recorded as the maintainer's final approval of the license
wording and template, not a claim of outside legal sign-off.

LICENSE section 0 now describes applicability and prior-license preservation
without internal draft instructions. Customer documentation and the changelog
reflect approval while retaining the unreleased status of version 5.0.0. No
commercial version was published by this approval. Merge, release/tag publication,
and live marketplace or metadata changes still require separate authorization.
If publication occurs after the planned 2026-11-03 date, update the effective
date to the actual release date before publication.


## Publication authorization — 2026-11-03

After the merge of PR #75 (merge commit
`3de5125fd99fcf519a267b1818359c3014157a83`), the maintainer said publication may
proceed despite the two documented smoke failures. After being told the remaining
steps were release documentation, the historical PolyForm tag, the v5.0.0
GitHub Release, and repository description/website/topics, he explicitly asked
to perform those remaining steps. This supersedes the earlier pending-publication
status. No visibility, ownership, access, protection, security or billing change
is authorized or performed. The community catalog remains untouched.

Release records: [v5.0.0](https://github.com/insideout-ai/make-it-work/releases/tag/v5.0.0)
and [historical PolyForm snapshot](https://github.com/insideout-ai/make-it-work/tree/v4.19.2-polyform).
The historical tag targets `8d57b84fd0df8a99960bd29c2d2e1465f04ad7ea`; the commercial
tag targets the merged release-documentation commit after CI succeeds. The
release notes disclose the two accepted smoke failures, absence of a full model
eval rerun/live install rehearsal, and contractual-only license compliance.
