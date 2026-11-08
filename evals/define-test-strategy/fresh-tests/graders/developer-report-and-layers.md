---
type: llm
focus: trace
weight: 3
---

Grade the saved artifacts together with the actual generation/write trace.
The runner supplies snapshots labeled SAVED ARTIFACT for the map, report and
strategy. Use their actual contents even when the assistant never read the
files back into chat. NOT PRESENT means absent, not an empty or valid file.
Do not fail merely because a generator printed only a success message.

1. Newly discovered tests have explicit strategy layer labels based on their
   assertions (Unit for this fixture's pure task/helper functions). Unknown
   requires a concrete classification uncertainty. Placement and runner are
   not layer labels. Use the saved map, or the complete proposed map when a
   write was blocked.
2. After successfully saving the strategy and final map, the run generates
   .claude/testing/TEST-MAP.md from that final map. The saved report contains
   layer counts, feature mappings, unresolved scope and a collapsed catalog/
   evidence section. It distinguishes saved relevance from sufficient coverage
   or passing tests. Use the saved report to judge its contents.
3. The saved strategy gives EITHER a runnable refresh invocation OR a valid
   link to .claude/testing/TEST-MAP.md with directions to use its resolved
   Refresh command. A correct relative link from the strategy directory plus
   that instruction is sufficient; copying the command is not required. Verify
   the linked report is present and contains a resolved command. A broken link,
   missing report claimed as saved, or unfinished placeholder invocation in
   the saved strategy fails, even alongside a valid link. The final handoff
   may point to the report's command, but must not call a placeholder the actual
   command. Instruction examples in skill bodies are not saved strategy or
   final handoff content and must not trigger a placeholder failure.
4. If metadata/report writes were denied or failed, require accurate partial/
   blocked reporting and complete proposed metadata as required, unchanged
   pointers, and no false claim of a saved report or bypass of the denial.
   An honestly reported blocked write is not failed solely for the absent
   file. Missing artifacts without a corresponding reported write failure do
   fail. Report-only generation must not advance semantic freshness baselines;
   judge that operation from the trace, not report contents alone.

PASS only when all applicable criteria hold. Name each failure with evidence;
distinguish an unavailable artifact from one actually inspected and incorrect.
