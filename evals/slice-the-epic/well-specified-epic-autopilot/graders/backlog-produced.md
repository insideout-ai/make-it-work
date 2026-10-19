---
type: llm
focus: trace
weight: 3
---

This is the full transcript of a `slice-the-epic --autopilot` run against a well-specified CSV-export epic with five acceptance criteria. Judge the whole transcript, including the contents of Markdown Write calls; the final message may only link the artifact and summarize the result.

PASS only if ALL of the following hold:
1. It offers 2–3 tailored approaches or technique combinations, with concrete example slice titles and a recommendation, then selects the recommended option automatically without waiting for the user.
2. It saves a `make-it-work/slices-*.md` artifact with multiple stable-ID slices and complete acceptance criteria or completion evidence. User-facing slices use Given/When/Then. If file creation is explicitly denied by the environment, complete Markdown in chat plus an honest unsaved-file notice is an acceptable fallback; silently omitting the artifact or claiming a denied write succeeded is not.
3. It does NOT ask the user a clarifying question, pause, or use `[autopilot best-guess]` to qualify any backlog decision — the epic was unambiguous, so autopilot should never have needed its best-guess fallback. A final summary saying no assumptions were auto-resolved is fine, even if it names the marker while negating its use.
4. It briefly wraps up (slice count, approach, recommended starting point).
5. The deliverable includes a Mermaid dependency map with all slice IDs and a readable relationship table (or an explicit no-dependencies statement). Hard prerequisites and recommended sequencing are distinguished; the described implementation stages respect those relationships, identify parallel opportunities, and propose a useful MVP boundary. Reject contradictory relationships or missing slice references.

List any that fail, quoting the relevant part of the message.
