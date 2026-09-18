# make-it-work

> From idea to delivery: make your codebase AI-ready with context skills, shape requirements, slice work, and review changes against the requirements and codebase guidance.

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

### `/make-it-work:shape-the-epic`

Acts as a senior product coach to help you write a complete, elaboration-ready epic for any work management tool (Jira, Azure DevOps, Linear, Shortcut). Runs five structured phases — context ingestion, discovery interview, internal analysis, criterion-by-criterion validation, and epic generation — covering value proposition, target users & permissions, KPIs, use cases with Gherkin acceptance criteria, rollout plan, and definition of done.

Use it when writing or improving a product epic, fleshing out a feature idea for engineering, or whenever you need to turn a rough concept into a spec that's ready for elaboration.

---

### `/make-it-work:slice-the-epic`

Slices a requirement, epic, ticket, or user story into small, independently deliverable increments, and writes each slice as a proper Gherkin (Given/When/Then) user story. Picks a slicing technique (functional, workflow, data, user role, or complexity slicing), sizes each slice to half a sprint or less, and orders them by risk.

Use it whenever a ticket or epic feels too big and needs to become sprint-sized stories - including requests like "this ticket is too large," "break this into smaller pieces," or "help me write user stories for this epic."

---

### `/make-it-work:close-the-gaps`

`close-the-gaps` acts as a Product Analyst before development begins. It loads the project skills relevant to the ticket, digs into the affected code, and surfaces every gap - unclear language, missing edge cases, conflicting requirements, unstated assumptions - then walks you through them one question at a time.

The output is a Gherkin-ready refined spec. Unknown unknowns become explicit. Requirements are solid before a single line of code is written.

Teams use it before refinement meetings so developers arrive with focused questions rather than discovering gaps mid-discussion. Or post the output directly to the Jira ticket for product to review asynchronously - no meeting needed for straightforward tickets.

The cost of a vague ticket is paid in rework. `close-the-gaps` closes the gaps before the first line of code.

---

### `/make-it-work:review-the-pr`

Acts as a reviewer grounded in the project's own documentation instead of generic intuition. Runs three passes - business correctness against the `uc-*` skills, regression safety against the `domain-*` skills and architectural constraints, and coding standards against `CLAUDE.md` - then a docs-sync check to confirm skills were updated alongside behavior. Emits a verdict-first, evidence-dense report, both as a pasteable file and a scannable chat summary.

Use it to review a pull request or diff in any repo that keeps the `go-deep` knowledge base (`CLAUDE.md` plus `uc-*`/`domain-*` skills and `.claude/rules` docs).

---

## Keep improving

When Claude gets something wrong, don't just correct it - ask why it missed. What was unclear in the skills or rules? Update them so it doesn't happen again. Every misunderstanding is a chance to make the knowledge base more accurate. Over time the system gets sharper, not stale.

---

## Usage

```
/make-it-work:go-deep                        # Scaffold full project docs from scratch
/make-it-work:shape-the-epic                 # Write a complete epic from scratch or improve an existing one
/make-it-work:slice-the-epic                 # Slice a large requirement into sprint-sized Gherkin user stories
/make-it-work:close-the-gaps TICKET-123      # Refine a ticket by ID
/make-it-work:close-the-gaps                 # Paste ticket content directly
/make-it-work:review-the-pr                  # Review a PR against the project's own skills and CLAUDE.md
```

## Requirements

- [Claude Code](https://code.claude.com/docs/en/overview), installed and authenticated.
- A project workspace, ideally a Git repository. `go-deep` and `review-the-pr` inspect the repository's code and documentation.
- For ticket IDs such as `TICKET-123`, a separately installed and configured issue-tracker integration. You can always paste the ticket content instead.

`review-the-pr` is most effective after `go-deep` has created the project's `CLAUDE.md`, `.claude/rules` documentation, and domain/use-case skills.

## Install

Choose one installation channel. Installing the plugin from both marketplaces can make it unclear which copy Claude Code is loading.

### Anthropic community marketplace

Use the community marketplace for the curated distribution. Community catalog updates may lag behind a new upstream release; use the InsideOut AI marketplace when you need the newest publisher release immediately.

```text
/plugin marketplace add anthropics/claude-plugins-community
/plugin install make-it-work@claude-community
```

### InsideOut AI marketplace

Use the publisher's marketplace for the direct upstream distribution:

```text
/plugin marketplace add insideout-ai/make-it-work
/plugin install make-it-work@insideout-ai
```

Reload Claude Code after installation if the skills do not appear immediately:

```text
/reload-plugins
```

## Update

Update the marketplace metadata first, then update the plugin from the same channel you used to install it.

Community marketplace:

```text
/plugin marketplace update claude-community
/plugin update make-it-work@claude-community
```

InsideOut AI marketplace:

```text
/plugin marketplace update insideout-ai
/plugin update make-it-work@insideout-ai
```

Run `/reload-plugins` or restart Claude Code after updating.

## Example workflows

Onboard an established repository and create its project knowledge base:

```text
/make-it-work:go-deep
```

Turn a rough feature idea into an elaboration-ready epic, then split it into independently valuable stories:

```text
/make-it-work:shape-the-epic Add delegated account access for enterprise customers
/make-it-work:slice-the-epic
```

Refine a ticket before implementation, using either an issue ID or pasted content:

```text
/make-it-work:close-the-gaps TICKET-123
```

Review the current pull request against the repository's documented product behavior and architecture:

```text
/make-it-work:review-the-pr
```

## Data access and permissions

This plugin contains Markdown-based skills. It does not bundle executable scripts, hooks, MCP servers, or telemetry. When you invoke a skill, Claude may read files in the current project and may propose or write project documentation and review artifacts as part of that workflow.

Issue-tracker access is not included in this plugin. Looking up a ticket by ID requires a separate integration that you install and authorize; pasting the ticket content requires no issue-tracker connection.

## Troubleshooting

- **A skill is not available:** run `/reload-plugins` or restart Claude Code, then confirm the plugin is enabled with `/plugin`.
- **Claude Code loads an older version:** update both the marketplace and the plugin using the commands above, then reload plugins.
- **A ticket ID cannot be found:** configure an issue-tracker integration or invoke `close-the-gaps` without an ID and paste the ticket content.
- **`review-the-pr` cannot find project guidance:** run `go-deep` first, or confirm the repository contains the expected `CLAUDE.md`, `.claude/rules`, and domain/use-case skills.
- **The plugin is installed twice:** remove or disable one copy in `/plugin` and keep the marketplace channel you want to follow.

If the problem persists, [open a GitHub issue](https://github.com/insideout-ai/make-it-work/issues) with your Claude Code version, installation channel, and the relevant error message.

See [SUPPORT.md](SUPPORT.md) for support and feature-request guidance. Report suspected vulnerabilities privately by following [SECURITY.md](SECURITY.md).

## Development

Validate the manifest, bundled skills, and marketplace entry before opening a pull request:

```sh
claude plugin validate .claude-plugin/plugin.json --strict
claude plugin validate skills --strict
claude plugin validate .claude-plugin/marketplace.json --strict
```

---

Built by [insideout-ai](https://github.com/insideout-ai)
