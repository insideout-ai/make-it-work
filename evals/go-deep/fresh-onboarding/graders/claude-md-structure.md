---
type: llm
focus: { source: file, path: "CLAUDE.md" }
weight: 2
---

Judge whether this CLAUDE.md file satisfies all of the following:

1. It contains a section about a "Skill Loading Gate" (a blocking prerequisite telling the AI to load relevant skills before doing anything else), and that section appears BEFORE a "Quick Reference" section.
2. It contains a "Rules Files" section listing files under `.claude/rules/`.
3. It contains a "Skills Reference" section with two separate tables: one for domain skills, one for use-case skills.
4. It contains an "After Any Feature Change" section, and that section is the LAST section in the file.
5. Domain skills in the Skills Reference use `domain-{id}-{name}` names with at least two digits in each ID, starting at `01`. Distinct domains have distinct IDs, the Domain Skills table has an ID column matching those names, and domain references elsewhere in the file use the same full names. Do not require any particular domain-to-ID ordering or a shared sequence with UC IDs.
6. The new-domain maintenance instruction tells future feature work to use the next ID above the highest assigned domain ID, preserve existing IDs, and not reuse retired IDs. It must not tell this fresh repository to create unnumbered domain skills.
7. The file is reasonably concise for a tiny project (not padded with filler). This is a soft signal only: note it, but it never decides the verdict. Do not judge how many domains or use cases the file lists.

PASS only if all of 1-6 hold; subsections nested under the last section don't change which section is last. Explain which (if any) are missing.
