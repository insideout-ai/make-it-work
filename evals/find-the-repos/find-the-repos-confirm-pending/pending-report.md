# Repo Shortlist — off-cycle-date-controls
Status: Pending review
Ticket identity: provisional slug from Off-cycle date controls
Related keys: MARV-45441 — independent

## Existing or partial implementation found — verify and finish

The update payload and checkbox mapping exist. Persistence, endpoint wiring,
and external behaviors remain unverified. This is partial local coverage.

## Coverage and Handoff

| Requested behavior / operation | Local evidence or gap | External system / destination | Next action |
|---|---|---|---|
| Date edit permission payload | backend/src/offCycles.ts, UpdatePayload | Local backend | Verify and finish |
| Checkbox Allow payout date changes | checkbox-ui/src/controls.ts, dateControl | Local UI | Verify and finish |
| generate-report | No generate-report or generateReport hits across all six source roots | payroll-summary repo unresolved | Locate the service repo and route this work there |
| Payout execution | No implementation established locally | Payments repo/team unresolved | Route the story for assessment in Payments |

## Definite Matches

- **backend** — Defines the requested payload fields. Evidence: backend/src/offCycles.ts § UpdatePayload.
- **checkbox-ui** — Defines the exact checkbox label and permission mapping. Evidence: checkbox-ui/src/controls.ts § dateControl.
- **code-only-api** — Uses the ticket-specific permission field. Evidence: code-only-api/src/schema.ts § canEditDate.

## Possible Matches

- **words-only** — Generic payroll/Payments tags only; behavior is unestablished. Evidence: words-only/src/tags.ts § upstreamTag.

## Assessment Evidence

| Repo | Tier / status | Owner / owner evidence | Docs assessed | Skills read | Code search and evidence | Flags / provenance |
|---|---|---|---|---|---|---|
| backend | Definite | catalog-info.yaml spec.owner group:default/payroll-api; root CODEOWNERS @acme/legacy-api vs .github/CODEOWNERS @acme/payroll-api | catalog only | none available | allowPayoutDateChange / payoutDate in src/offCycles.ts | no product.md; code-matched; owner evidence conflict |
| checkbox-ui | Definite | catalog-info.yaml spec.owner group:default/payroll-web; .github/CODEOWNERS @acme/payroll-web | catalog only | none available | exact checkbox label and permission field in src/controls.ts | no product.md; code-matched |
| code-only-api | Definite | catalog-info.yaml spec.owner group:default/payroll-core; .github/CODEOWNERS @acme/payroll-core | catalog only | none available | permission field in src/schema.ts | no product.md; code-matched |
| words-only | Possible | catalog-info.yaml spec.owner group:default/observability | catalog only | none available | generic payroll/Payments strings in src/tags.ts | needs corroboration |
| summary-viewer | No match | catalog-info.yaml spec.owner group:default/reporting | catalog only | none available | no specific identifier or generate-report/generateReport hits in src | not established as payroll-summary |
| health-probe | No match | catalog-info.yaml spec.owner group:default/platform | catalog only | none available | no ticket-specific or central-operation hits in src | shared system is scope evidence only |

## Possibly Already Implemented

| Repo | Existing element observed | Code evidence | Verification still needed |
|---|---|---|---|
| backend | Payload fields | src/offCycles.ts § UpdatePayload | API wiring and persistence |
| checkbox-ui | Checkbox label and date lock mapping | src/controls.ts § dateControl | Integrated UI behavior |
| code-only-api | Date-edit permission predicate | src/schema.ts § canEditDate | Consumers and end-to-end behavior |

External systems named in the ticket, not in workspace: Payments and payroll-summary; central work is unassessed and needs routing to their service repos/teams, which remain unresolved.

## Excluded

None

## Reviewer Notes

Keep external work visible until the service repos can be assessed.
