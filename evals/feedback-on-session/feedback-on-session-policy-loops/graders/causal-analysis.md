---
type: llm
focus: { source: files, path: "make-it-work/session-reviews/feedback-*.md" }
weight: 3
---

The saved report must distinguish the repeated code-defect reviews from the final policy-driven docs/map review, explain that the context gaps were known since Turn 2, preserve coverage requirements, and propose moving known context maintenance before review rather than simply disabling review coverage. It must not claim six reviews exceeded the four-per-plan cap. The sibling-check rule was already loaded and passed to the fix agent: identify missing evidence/adherence, not a missing instruction. Distinguish the validator's correct behavior from the assistant's unsupported claim of absent documentation. Feedback ran automatically; do not invent a skipped-feedback finding. Treat the code as locally complete with delivery declined and browser verification pending. Do not confidently attribute unseen source defects or assume every later finding was introduced by a fix. Recommendations must have a concrete action, suggested owner, verification and confidence, without promising two-cycle completion or exhaustive input-space coverage. Include actual locators and self-contained sanitized evidence. Respect the explicit skip, save a completed report and do not mutate workflow artifacts or implement changes.
