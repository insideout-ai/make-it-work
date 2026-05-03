# make-it-work

> Skills that make Claude actually work in your project. Not just generally, but *specifically*, the way your codebase is built.

## Skills

### `/make-it-work:go-deep`
Maps your codebase from the inside out and builds a layered documentation system so every Claude session starts grounded in your project's real structure, rules, and use cases. Not generic assumptions.

Run it once when you onboard a new project. Run it again when the project evolves — it audits what's there, finds what's drifted or missing, and updates CLAUDE.md, architecture.md, product.md, and the relevant skills to match the current state of the code.

Part of what `go-deep` builds is a hard enforcement rule in CLAUDE.md: before every commit, Claude checks whether any skill or doc file needs updating. New domain? Create the skill. Existing domain changed? Update it. Nothing ships without the knowledge base staying in sync with the code.

### `/make-it-work:close-the-gaps`
Acts as a Product Analyst before development begins: finds every gap in a ticket (unclear language, missing edge cases, conflicting requirements), walks you through them one by one, and outputs a Gherkin-ready refined spec.

The cost of a vague ticket is paid in rework. close-the-gaps makes sure requirements are solid before a single line of code is written.

## Install

```bash
/plugin install make-it-work@insideout-ai
```

Or browse to [claude.com/plugins](https://claude.com/plugins) and search **make-it-work**.

## Usage

```
/make-it-work:go-deep                        # Scaffold full project docs from scratch
/make-it-work:close-the-gaps TICKET-123      # Refine a ticket by ID
/make-it-work:close-the-gaps                 # Paste ticket content directly
```

## Why

Built for engineering teams working on large, complex codebases. Not greenfield side projects. When your codebase has history, domain rules, and legacy decisions baked in, "generally smart" isn't enough. Claude needs to know *your* project.

`make-it-work` gives Claude the project-specific depth it needs to stop making avoidable mistakes.

---

Built by [insideout-ai](https://github.com/insideout-ai)
