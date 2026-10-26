---
tags: [slice-the-epic, publication]
allowed_tools: [Write]
max_turns: 10
timeout_seconds: 180
runs: 1
---

/make-it-work:slice-the-epic

Resume only native dependency-link planning for an existing interactive slicing run. The slice tickets were already created under the original Epic DEMO-800 at https://tracker.example.test/browse/DEMO-800. I now explicitly authorize adding the hard-dependency links listed below. Do not ask for permission again, create new tickets, repeat shaping, or publish a source comment in this handoff.

Confirmed slice mapping:
- S-1 = DEMO-801
- S-2 = DEMO-802
- S-3 = DEMO-803
- S-4 = DEMO-804
- S-5 has no confirmed issue key because its creation failed.

Hard dependency edges, prerequisite to dependent: S-1 -> S-2; S-1 -> S-3; S-2 -> S-3; S-3 -> S-5. A duplicate S-1 -> S-2 entry appears in older notes; it represents the same edge.

Recommended sequence only: S-1 before S-4. S-4 has no hard dependencies.

Existing verified Jira relationship: DEMO-801 blocks DEMO-802. There is also a generic relates-to relationship between DEMO-801 and DEMO-803; it is not a blocking link. No other matching blocking links exist. The configured blocking relationship is named Blocks and has reciprocal labels blocks / is blocked by.

This is an isolated local planning test. There is no live linking connector for tracker.example.test, and no live calls may be made. Save the exact native-link execution plan as make-it-work/DEMO-800-native-link-plan.md, showing deduplicated slice pairs, resolved blocker and blocked keys, existing/new/pending outcomes, reasons, and counts. Treat linkable missing edges as ready to create in the plan, not as remotely created. Do not fabricate a key for S-5 or claim any new remote operation succeeded.
