---
type: llm
focus: { source: file, path: "make-it-work/DEMO-800-native-link-plan.md" }
weight: 3
---

PASS if the native-link plan deduplicates to exactly four planned direct hard relationships: S-1/DEMO-801 blocks S-2/DEMO-802 (already present, reuse); S-1/DEMO-801 blocks S-3/DEMO-803 (ready to create); S-2/DEMO-802 blocks S-3/DEMO-803 (ready to create); and S-3/DEMO-803 blocks S-5 (pending because S-5 has no confirmed issue). The counts must distinguish four unique planned hard edges, one existing blocking link, two missing linkable pairs, and one pending pair, with zero new links actually created in this local-only test.

Both predecessors of S-3 must remain represented, including the explicit S-1-to-S-3 hard edge even though a transitive path also exists. The relates-to link cannot substitute for a blocking link. Do not add a reverse duplicate, infer a transitive S-1-to-S-5 or S-2-to-S-5 edge, turn recommended S-1-to-S-4 sequencing into a blocker, invent a ticket key, or link the Epic itself as a dependency. Explain that S-4's recommendation remains informational. FAIL otherwise.
