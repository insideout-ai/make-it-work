---
description: "Deprecated alias for /make-it-work:assess-change."
argument-hint: "<explicit delivery scope or PR reference>"
---

`/make-it-work:assess-complexity` has been renamed to `/make-it-work:assess-change`.
Tell the user briefly that this is the deprecated command name, then read `${CLAUDE_PLUGIN_ROOT}/skills/assess-change/SKILL.md` and follow it for this same request, preserving all supplied arguments and assessment context:

$ARGUMENTS

Use `assess-change` as the skill identity, its directory as the base for relative references, and the report paths returned by its helper. Run the canonical workflow once; this alias adds no separate assessment or permissions.
