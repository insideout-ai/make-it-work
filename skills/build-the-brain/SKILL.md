---
name: build-the-brain
description: Build a work-focused "second brain" for the user — a markdown profile of their org, key contacts, communication style, active initiatives, and open loops synthesized from their work email/Slack, not a general personal knowledge base or life-notes system. Includes a Cowork Project setup so that file is actually read every session, and a scheduled task that keeps it refreshed and sends a daily summary. Use this whenever the user asks to build, create, update, refresh, or extend a "second brain," "brain.md," or work context file from their email/Slack/Teams history. Also trigger for "learn my organization / contacts / writing style," "make Claude always use this file," "set up a Cowork project around my brain file," or "send me a daily summary of what needs my attention" — even without the words "second brain."
---

# Build the Brain

This skill has three parts. They build on each other but are each independently useful — jump to whichever one matches what the user asked for.

1. **Build/refresh `brain.md`** — a profile of the user's working life, from their own email/Slack.
2. **Set up a Cowork Project** so that file gets read automatically every session, instead of only when someone remembers to mention it.
3. **Set up a scheduled task** that refreshes the file daily and sends a summary of what needs attention.

The three connect: Part 2 is what makes Part 1's file actually useful without the user re-uploading it every time, and Part 3 is what keeps it current without the user having to ask again. A brain.md nobody re-reads, or one that goes stale, is much less valuable than the sum of its parts — so if the user only asks for Part 1, it's worth mentioning Parts 2 and 3 exist once the file is built.

---

## Part 1: Build or refresh brain.md

### What this produces

A single markdown file (default name `brain.md`) that a future Claude session can read to answer things like "find my important emails," "draft a reply to X in my style," or "who owns this initiative." It's not a knowledge base of facts about the world — it's a profile of *the user's working life*: who they talk to, how, and what's currently in flight.

The file has different kinds of content, and it matters that you keep them distinct:

- **Stable content** — role, reporting line, key people, communication style. Changes slowly; the most reusable part.
- **Time-sensitive content** — active initiatives, open loops awaiting a response. Goes stale within days. Always label it as a dated snapshot, not settled fact.
- **A changelog** — see below. This is what makes Parts 2 and 3 work over time.

Do not include a decisions/commitments log (a record of what's been approved or promised) — that's trivially searchable directly in email/Slack, and duplicating it here just creates another place for it to go stale.

### Step 1: Find the target file

Check whether the user has a folder connected already. If not, or if it's unclear where an existing `brain.md` lives, ask for a folder path (via `request_cowork_directory`) rather than guessing. If a `brain.md` already exists in that folder, read it in full before doing anything else — you'll need it for the merge step below.

### Step 2: Pick the scan window

Default to the last 7 days of email and Slack unless the user asks for something else. If they want deeper confidence on patterns (recurring meetings, initiatives running for weeks, contacts who are frequent but not this week), run a second, lighter pass over a longer window (30 days worked well) — spot-check the people/threads you already suspect are recurring rather than re-pulling everything.

When pulling email, request only the fields you need (subject, from/to, date) rather than full bodies — full inboxes over any real time window will blow past a single tool call's output limit. If a pull does overflow into a saved file, use Grep to pull out just what you need rather than reading the whole file.

### Step 3: Build or refresh the sections

Work through these in order. Look at what the data actually shows rather than assuming titles/roles from context — reporting lines especially should come from an authoritative source (an org chart the user provides) if one exists, not be inferred from who emails whom, since frequent contact doesn't imply hierarchy.

1. **Who I am** — the user's role, name, email, chat-app user ID, and reporting line if you can establish it (manager above, direct reports below, with titles). Only state a reporting relationship as fact if it comes from an org chart or explicit statement — otherwise describe it as inferred. Capturing name/email/user ID here matters beyond this file — Part 3's scheduled task needs them and shouldn't have to re-derive them.
2. **Key people** — group by actual relationship: direct reports, manager, other frequent contacts, external vendors, and a lower-priority "broader orbit" for people who appeared once or twice. Rank by real interaction frequency, not assumption. For each person, capture channel (email vs. Slack, language used) and a style note — a real, verbatim quote is far more useful here than a generic adjective like "casual."
3. **Active initiatives** — a short table: initiative, owner/stakeholders, current status, next action. Pull these from recurring subject lines, meeting series, and multi-message threads — a one-off email isn't an initiative.
4. **Open loops** — things left unresolved: a question that never got an answer, a decision explicitly deferred, an owner explicitly left TBD.
5. **Known recurring docs/canvases** (optional, only if relevant) — if the user maintains living documents outside plain messages (a Slack canvas for 1:1 notes, a shared doc for team status), list them by name and ID/link. Plain message search usually can't surface this kind of content, so recording the direct reference here saves every future session (especially the scheduled one in Part 3) from having to re-search for it.
6. **Writing style** — separate Slack from email if they differ, and separate by audience if tone clearly shifts. Prefer real examples over abstract description.
7. **How to use this file** — practical defaults: whose threads matter most, what tone to default to, when to switch languages, etc.
8. **Changelog** — a short list at the very top of the file (right under the title), newest first, one dated line per refresh describing what changed ("2026-07-20: bumped Eran Steinitz to core contact, closed the RPA-owner open loop"). Keep only the 5 most recent lines — trim older ones on each refresh. This is what lets a scheduled run (Part 3) show its work without the file growing forever, and what lets the user glance at the top and see what's new since they last looked.

### Step 4: Merge, don't overwrite

If a `brain.md` already existed, treat this as a refresh, not a rewrite. Compare what you found against what's there and change only what's actually different: new people, people who should move categories, initiatives that are new or resolved, open loops that closed or appeared. Leave alone anything still accurate — and prefer the existing file's phrasing when it's more specific or vivid than a fresh regeneration (verbatim quotes especially).

Before editing the live file, show the user a short summary of what you're planning to change, especially anything sensitive (a personal or HR-adjacent detail, a correction to someone's role). Use Edit for targeted changes rather than rewriting the whole file. Add the one-line changelog entry as part of this same edit.

### Step 5: Flag freshness

Anything in Active Initiatives or Open Loops should read as a snapshot ("as of [date] — reverify before acting"), since a future session (or the scheduled task) may pick this up weeks later. Key People / Writing Style don't need this caveat as urgently — they're the part meant to last.

---

## Part 2: Set up a Cowork Project around the brain

A brain.md sitting in a folder isn't used automatically — in a standalone Cowork session, memory doesn't carry over between sessions, so nothing prompts a future Claude to go read it. Cowork Projects solve this: a Project has a persistent "Instructions" field that's read every session in that project, plus its own memory scoped to the project. Pointing a Project at the brain's folder with the right instructions is what actually makes this a living second brain instead of a file that only helps when someone remembers to attach it.

Read `assets/project-instructions-template.md` for the instructions text. Fill in its placeholders using what you already know from Part 1 (the user's name, the brain.md path, whether a recurring-docs/canvases section exists, whether a scheduled refresh task exists yet and its cadence — leave out any clause that doesn't apply rather than leaving a placeholder unfilled). Present the completed text to the user and tell them exactly where it goes:

1. Open the Projects panel and either create a new project ("+" → "Use an existing folder," pointed at the brain's folder) or open the existing project tied to that folder.
2. Find the project's Instructions field and paste the filled-in text there.

There's no tool available to create a Project or set its instructions programmatically — this is a manual step in the app. Your job is to get the copy-paste text exactly right, not to attempt the setup yourself.

---

## Part 3: Set up a scheduled refresh + summary task

This is what keeps the brain current without the user asking again: a recurring scheduled task that scans the last day's activity, updates brain.md, and sends a short summary.

The critical thing to understand and to tell the user if they're unfamiliar with scheduled tasks: each scheduled run is a brand-new session with zero memory of any previous run. It only knows what's in the prompt itself, plus whatever it reads from brain.md. That's exactly why brain.md matters here — without it, every run would start from zero, either repeating information or missing that something was already resolved. With it, each run reads yesterday's state and updates only what changed.

### Step 1: Gather what the template needs

Most of this should already be sitting in brain.md's "Who I am" section from Part 1 — reuse it rather than re-asking: the user's name, email, chat-app user ID, and role. Also confirm:
- The brain.md path.
- Which email and chat-app tools are actually connected (load via ToolSearch and note the exact tool names — don't guess).
- Cadence (default: every weekday morning) and delivery destination (default: a self-DM, falling back to a direct message to their own user ID if that fails).

### Step 2: Fill in the template

Read `assets/scheduled-task-prompt-template.md` and substitute every placeholder. Don't leave a bracketed placeholder in the final prompt — either fill it in or, if a piece genuinely doesn't apply to this user's setup (e.g., no recurring docs/canvases exist yet), remove that section rather than leaving it dangling.

### Step 3: Confirm, then create

Show the user the filled-in prompt along with your proposed task name and cron schedule. Once they confirm, create it with `mcp__scheduled-tasks__create_scheduled_task` (load via ToolSearch if it's deferred). If they later want to change cadence or wording, use `mcp__scheduled-tasks__update_scheduled_task` rather than creating a duplicate.
