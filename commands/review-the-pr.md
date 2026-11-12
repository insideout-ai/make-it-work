---
description: "Deprecated alias for /make-it-work:review-the-code."
argument-hint: "[--autopilot]"
---

`/make-it-work:review-the-pr` has been renamed to `/make-it-work:review-the-code`.
Tell the user briefly that this is the deprecated command name, then read `${CLAUDE_PLUGIN_ROOT}/skills/review-the-code/SKILL.md` and follow it for this same request, preserving all supplied arguments and review context:

$ARGUMENTS

Use `review-the-code` as the skill identity, its directory as the base for relative references, and its documented report/log paths. Run the canonical workflow once; this alias adds no separate review or permissions.
