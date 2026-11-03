# Commercial licensing migration record

Status: **Draft — Pending Legal Review**. Audit date: 2026-11-01.
Branch: `chore/commercial-annual-licensing`. Nothing here authorizes a merge,
commercial release, marketplace publication, or live settings change.

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
provenance signals, not proof of ownership or rights clearance. Neither person
can be classified as an external contributor or an employee solely from Git.
No CLA, assignment, DCO agreement, or third-party NOTICE was found in tracked
files. The prior contribution policy supplied contributions under PolyForm;
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

**Blockers to an effective commercial release:** contributor/chain-of-title
clearance and third-party provenance; legal approval of the agreement and inbound
policy; missing legal identity, email, jurisdiction, and effective date. Draft
preparation can proceed, but no blanket relicensing claim is made.

### Hosting and marketplace requirements

[GitHub Terms D.4–D.6](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
require hosting and public view/fork rights, and address inbound contributions.
A blanket ban on all copying/forking would conflict with public hosting. The
draft preserves platform rights while restricting redistribution outside them.
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
specific third-party catalog accepts these paid terms. README and SUPPORT refer
to `claude-community` as an existing channel; its current operator, actual listing,
redistribution/caching terms, and paid-license policy were not verified. Obtain
operator confirmation before updating any external catalog. The self-hosted
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
terms. This branch bumps the plugin manifest from 4.19.2 to 5.0.0 for the proposed transition. Version 5.0.0 remains unreleased and the agreement remains a non-effective draft.

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

## Unresolved human/legal decisions

1. Confirm the full legal Licensor, ownership of the InsideOut AI name, contact
   email, governing jurisdiction/courts, and commercial effective date.
2. Confirm each contributor's employment/contractor status and assignments or
   explicit commercial relicensing permissions, including the earlier MIT to
   PolyForm change. Obtain missing permissions or exclude affected material.
3. Complete provenance/third-party notice review; preserve independent licenses
   and any required MIT attribution. Review AI-generated contributions against
   service terms and source provenance rather than treating AI trailers as clearance.
4. Approve a future inbound agreement/CLA with commercial licensing and
   distribution rights. CONTRIBUTING temporarily blocks merging external patches
   for the commercial release until written terms are arranged; it is not a CLA.
5. Approve trial organization identity, affiliated-entity treatment, acceptance
   evidence, and how evaluation by prospective contributors is authorized.
6. Approve proposed payment notice/cure periods, manual renewal default,
   refund terms, warranty exclusions, liability cap (including zero-fee trials),
   exceptions, termination and court provisions. These are draft choices, not
   established business policies. Set pricing, currency, tax handling, due dates,
   purchase/renewal process, subscription dates, and affiliates in an Order Form.
7. Approve the proposed first commercial version (`5.0.0`, now assigned in the draft manifest),
   publication date, release boundary, and customer notice. Review whether generated
   artifacts ever embed protectable Software templates and clarify those cases.
8. Confirm policies of every external marketplace/operator, including caching,
   mirroring, commercial terms and preservation of historical versions.

## Trial, activation, expiration, and renewal recommendation

Current enforcement is legal only. There is no trial ledger, license activation,
license-key validator, payment integration, telemetry, or trusted runtime gate.
Skills are loaded as Markdown and invoke local deterministic helpers; no universal
licensing entry point covers all skills or installation. Public source also makes
local bypass possible. A local first-run timestamp cannot establish a single
organization-wide trial or reliably survive new machines, deletion, or clock
changes. A prompt-only warning is not enforcement.

For an initial launch, maintain an organization ledger manually: stable legal
organization ID, acknowledged earliest install/execute date, trial end, signed
Order Form, paid term start/end, and included affiliates. Provide an entitlement
file containing organization ID and dates, deployed by the customer's admin to a
shared organization-managed location. Avoid per-developer licensing and never
store secrets in the repository. Renewal updates the shared entitlement's term;
expiration ends rights to commercial versions but never deletes customer work or
revokes old-license versions. Publish clear notices and an explicit acceptance
step before the first commercial installation; auto-update must not silently
stand in for agreement.

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

After legal clearance and explicit publication approval, proposed command:

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

- [ ] Clear all ownership, third-party, CLA and legal questions above; record evidence.
- [ ] Fill legal placeholders, obtain counsel approval, and remove draft status only
      in the approved release change. Approve Order Form and acceptance flow.
- [ ] Re-audit remote HEAD/tags/releases and designate the final PolyForm boundary.
- [ ] With explicit approval, create/publish the historical tag without rewriting history.
- [x] Assign the distinct proposed version 5.0.0 in manifest/changelog together so
      caches and users distinguish the new license from published 4.19.2 copies.
- [ ] Give existing users clear terms, trial start and opt-in/acceptance instructions,
      immutable historical links and a path to remain on prior-license versions.
- [ ] Confirm all marketplace policies and approve any listing or source-ref updates.
- [ ] Approve and apply website/GitHub metadata and commercial enquiry/renewal process.
- [ ] Rerun CI checks and documented full eval suite before release; record results.
- [ ] Obtain explicit approval before merge, tag publication, commercial release,
      or live marketplace change. None is performed by this preparation task.

## Suggested pull request

Title: Prepare draft annual organization licensing and preserve legacy grants

Body:

Make It Work currently has PolyForm licensing without an annual subscription
model. Prepare a draft commercial agreement for future expressly designated
releases: one 30-day organization trial, then renewable annual licensing with
unlimited developers and subscription maintenance. Align README, support,
contribution policy and both manifest license references; preserve prior PolyForm
and MIT grants with verbatim archived texts and immutable snapshot links.

This is Draft — Pending Legal Review. Ownership/contributor clearance, third-party
provenance, legal placeholders, marketplace policy confirmation, acceptance and
approval of the proposed commercial release version remain blockers to release. Plugin version is bumped from
4.19.2 to 5.0.0; workflow skills and execution code are unchanged. Version 5.0.0
remains unreleased and the agreement remains Draft — Pending Legal Review. No enforcement, payment
platform, live settings, published tag, release, or catalog change is included.
Do not merge this preparation until the release gates and approvals are resolved.

Validation: see the validation record below. Suggested legacy tag command and
commercial release checklist are included in this migration record.

## Validation record

Checks run locally with Node `v23.9.0` and Claude Code `2.1.309`:

| Check | Result |
| --- | --- |
| `node --test skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs` | 328 passed, 0 failed |
| `node --test evals/*.test.mjs` | 34 passed, 0 failed |
| `node evals/validate.mjs` | 100 eval cases validated; smoke covers 13 skills |
| `claude plugin validate .claude-plugin/plugin.json --strict` | Passed; directory advisory for missing icon |
| `claude plugin validate .claude-plugin/marketplace.json --strict` | Passed |
| `claude plugin validate skills --strict` | Passed |
| Documentation/manifest consistency inspection | Passed: matching custom reference, unchanged identity/source and matching proposed 5.0.0 version in manifest/changelog, local Markdown links and draft notices |
| Prior-license archive comparison | Byte-for-byte matches to the audited PolyForm base and MIT v2.1.0 |
| Workflow scope check | No changes under skills, scripts, evals, or .github |
| `git diff --check` and new-document whitespace inspection | Passed |
| `node evals/run-suite.mjs smoke` | Blocked: shell not signed in; exit 69, no model run started |

The icon advisory concerns an existing absence of a listing asset, not license
schema rejection. It does not change the CLI validation result or establish
directory policy approval. No real marketplace install/update was performed,
because that would change local marketplace state; unchanged source/identity and
passing package checks support compatibility but do not substitute for a release
installation rehearsal. CI pins Node 22 and Claude Code 2.1.267; that exact pair
was not reproduced locally. Run CI on the approved PR, sign in and run smoke
before opening it, and run the full model eval suite and installation rehearsal
before release. Full model evals were not run in this documentation-only task.

Local raw test outputs are `/tmp/miw-licensing-helper-tests.log`,
`/tmp/miw-licensing-eval-tests.log`, `/tmp/miw-licensing-eval-validate.log`, and
`/tmp/miw-licensing-smoke.log`. No model subagents were used. The pre-existing
untracked `output/` directory was left untouched. The follow-up delivery is authorized to commit these changes, push the dedicated
branch, and open a draft PR. Merge, tag publication, commercial release, and live
marketplace changes remain unapproved.


### Version-bump validation (2026-11-03)

At the maintainer's request, bump the proposed plugin version to 5.0.0 and
prepare a committed branch and draft PR. Manifest/marketplace/skill validation,
100-case eval inventory validation, version/reference/link/archive consistency,
and diff checks passed again. The combined helper/eval-runner test command
passed all 362 tests. Workflow files remain unchanged. This version bump does
not make the draft agreement effective or authorize a commercial release.
