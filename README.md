# make-it-work

> Two skills that make Claude actually work in your project — not just generally, but *specifically*, the way your codebase is built.

## Skills

### `/make-it-work:go-deep`
Before touching any code, Claude maps your codebase from the inside out: structure, domains, use cases, business rules. It builds a 3-tier documentation system (CLAUDE.md + orientation maps + on-demand skills) so every future session starts grounded — not guessing.

Run it once when you onboard a new project. Run it again when the project evolves — it audits what's there, finds what's drifted or missing, and updates CLAUDE.md, architecture.md, product.md, and the relevant skills to match the current state of the code.

### `/make-it-work:close-the-gaps`
Paste a ticket ID or raw ticket content. Claude loads the relevant project skills, digs into the affected code, and finds every gap — unclear language, missing edge cases, conflicting requirements, unstated assumptions. Then it asks you one question at a time and outputs a Gherkin-ready refined ticket.

No more tickets that make sense until a developer actually reads them.

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

Claude is a general-purpose tool. Most of the time it works well. But on complex, long-lived projects — where there are domain rules, legacy decisions, and subtle constraints — "generally smart" isn't enough.

`make-it-work` gives Claude the project-specific depth it needs to stop making avoidable mistakes.

---

Built by [insideout-ai](https://github.com/insideout-ai)
