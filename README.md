# make-it-work

> Deep codebase context for Claude. Solid requirements for your team. Before the first line of code.

Built for engineering teams working on large, complex codebases. Not greenfield side projects. When your codebase has history, domain rules, and legacy decisions baked in, "generally smart" isn't enough. Claude needs to know *your* project.

## The problem

Claude reads code well. But on a large, long-lived codebase it misses things - domain rules buried in old commits, implicit constraints never documented, business logic spread across layers. It guesses. The bigger the repo, the worse it gets.

`make-it-work` solves this at the source.

## How it works

### `/make-it-work:go-deep`

`go-deep` maps your codebase and builds a structured knowledge base that Claude loads before doing any work:

- **How and what** (always loaded) - two rule files: `architecture.md` is the *how* (domains, components, code areas), `product.md` is the *what* (use cases, actors, business rules).
- **Skills** (loaded on demand) - one per functional domain, one per use case. Each skill is a precise, minimal description of one area of your code - enough for Claude to navigate, not so much it bloats the context.

**The cross-reference map**

Every domain skill points to the use cases it affects. Every use case skill points to the domains it touches. Claude uses these cross-references automatically - when planning a feature it follows links to understand which domains are involved; when planning tests it traces which use cases are affected by a domain change, covering progression and regression without you having to map it out.

**Context efficiency**

Skill descriptions are written to be minimal but precise. Claude reads the description and decides whether to load the skill - it never pulls in unneeded information. The bigger the codebase, the more this matters: Claude gets exactly the context it needs for the task at hand, nothing more. No hallucinating, no misunderstanding, whether planning or executing.

**Staying in sync**

Part of what `go-deep` builds is a hard enforcement rule in CLAUDE.md: before every commit, Claude checks whether any skill or doc needs updating. New domain? Create the skill. Existing domain changed? Update it. Nothing ships without the knowledge base staying in sync with the code.

Run `go-deep` once when you onboard a project.

**What the code can't tell you**

During `go-deep`, Claude asks targeted questions so the how and what files capture what can't be learned from reading the code alone - giving Claude the full picture of the project, not just its structure.

The questioning phase reveals what Claude misunderstands about your code - surfacing domain concepts not obvious from reading files, business rules that live only in developers' heads, and assumptions baked into the architecture that were never written down. Answering those questions produces documentation no static analysis tool can generate: the *why* behind the *what*.

The skills produced are also useful outside Claude Code. Product managers can read domain and use case skills to understand what the system actually does, making them a live source of truth for writing requirements.

---

### `/make-it-work:close-the-gaps`

`close-the-gaps` acts as a Product Analyst before development begins. It loads the project skills relevant to the ticket, digs into the affected code, and surfaces every gap - unclear language, missing edge cases, conflicting requirements, unstated assumptions - then walks you through them one question at a time.

The output is a Gherkin-ready refined spec. Unknown unknowns become explicit. Requirements are solid before a single line of code is written.

Teams use it before refinement meetings so developers arrive with focused questions rather than discovering gaps mid-discussion. Or post the output directly to the Jira ticket for product to review asynchronously - no meeting needed for straightforward tickets.

The cost of a vague ticket is paid in rework. `close-the-gaps` closes the gaps before the first line of code.

---

### `/make-it-work:shape-the-epic`

Acts as a senior product coach to help you write a complete, elaboration-ready epic for any work management tool (Jira, Azure DevOps, Linear, Shortcut). Runs five structured phases — context ingestion, discovery interview, internal analysis, criterion-by-criterion validation, and epic generation — covering value proposition, target users & permissions, KPIs, use cases with Gherkin acceptance criteria, rollout plan, and definition of done.

Use it when writing or improving a product epic, fleshing out a feature idea for engineering, or whenever you need to turn a rough concept into a spec that's ready for elaboration.

---

### `/make-it-work:build-the-brain`

Builds a personal "second brain" for Claude: a `brain.md` profile of your org, key contacts, communication style, active initiatives, and open loops, synthesized from your email/Slack history. Sets up a Cowork Project so the file is read automatically every session, and a scheduled task that keeps it refreshed and sends you a daily summary of what needs attention.

Use it when you want Claude to know your organization, contacts, and writing style without re-explaining them every session, or when you want a standing daily summary of what's in flight.

---

## Keep improving

When Claude gets something wrong, don't just correct it - ask why it missed. What was unclear in the skills or rules? Update them so it doesn't happen again. Every misunderstanding is a chance to make the knowledge base more accurate. Over time the system gets sharper, not stale.

---

## Usage

```
/make-it-work:go-deep                        # Scaffold full project docs from scratch
/make-it-work:close-the-gaps TICKET-123      # Refine a ticket by ID
/make-it-work:close-the-gaps                 # Paste ticket content directly
/make-it-work:shape-the-epic                 # Write a complete epic from scratch or improve an existing one
/make-it-work:build-the-brain                # Build/refresh your brain.md, set up Cowork + a daily summary task
```

## Install

```bash
/plugin install make-it-work@insideout-ai
```

Or browse to [claude.com/plugins](https://claude.com/plugins) and search **make-it-work**.

---

Built by [insideout-ai](https://github.com/insideout-ai)
