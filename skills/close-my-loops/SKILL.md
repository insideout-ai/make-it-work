---
name: "close-my-loops"
description: "Build and maintain a personal work profile and open-loop tracker for the user's own job — a markdown file covering their org, key contacts, communication style, active initiatives, and open loops synthesized from their own email/Slack; a Cowork Project setup so that file is actually read every session; a scheduled task that keeps it refreshed and sends a daily summary; and on-demand per-person 1:1 prep checklists written into Slack canvases. Unlike skills that operate on a shared repo or ticket, this one runs on the user's personal accounts and data. Use this whenever the user asks to build, create, update, refresh, or extend a \"second brain,\" \"brain.md,\" or personal context file from their email/Slack/Teams history. Also trigger for \"learn my organization / contacts / writing style,\" \"make Claude always use this file,\" \"set up a Cowork project around my brain file,\" \"send me a daily summary of what needs my attention,\" or \"prepare me for my weekly/1:1 with X\" — even without the words \"second brain.\""
---

# Close My Loops

This skill has four parts. They build on each other but are each independently useful — jump to whichever one matches what the user asked for.

1. **Build/refresh `brain.md`** — a profile of the user's working life, from their own email/Slack.
2. **Set up a Cowork Project** so that file gets read automatically every session, instead of only when someone remembers to mention it.
3. **Set up a scheduled task** that refreshes the file daily and sends a summary of what needs attention.
4. **On-demand 1:1 prep checklists** — when the user asks to be prepared for a weekly/1:1 with a specific person, research that person's open threads and write the result into a persistent Slack canvas section for them, not just into the chat reply.

The four connect: Part 2 is what makes Part 1's file actually useful without the user re-uploading it every time, Part 3 is what keeps it current without the user having to ask again, and Part 4 is what turns "prepare me for X" from a one-off chat answer into something that persists in the same place the user already keeps notes for that person. A brain.md nobody re-reads, or one that goes stale, is much less valuable than the sum of its parts — so if the user only asks for Part 1, it's worth mentioning the other parts exist once the file is built.

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
2. **Key people** — group by actual relationship: direct reports, manager, other frequent contacts, external vendors, and a lower-priority "broader orbit" for people who appeared once or twice. Rank by real interaction frequency, not assumption. For each person, capture channel (email vs. Slack, language used) and a style note — a real, verbatim quote is far more useful here than a generic adjective like "casual." Flag which of these people are direct reports or the user's manager — Part 4 scopes its per-person canvases to exactly that set.
3. **Active initiatives** — a short table: initiative, owner/stakeholders, current status, next action. Pull these from recurring subject lines, meeting series, and multi-message threads — a one-off email isn't an initiative.
4. **Open loops** — things left unresolved, split into four groups by who owns the next move:
   - **My action items** — the user must do something next (reply, approve, decide, nudge).
   - **Waiting on others** — someone else owes the next step; the user only monitors or nudges if it stalls.
   - **FYI / monitoring** — no action pending, just context worth remembering.
   - **Resolved (recent)** — items closed out recently, kept briefly for history/traceability.

   Classify by judgment: if the next concrete step is the user's, it's an action item; if they're blocked on someone else, it's waiting-on-others; if there's nothing to do but it's worth remembering, it's FYI. Move items between buckets as status changes — an action item the user completes moves to Resolved; a waiting-on-others item that stalls might become an action item to nudge.

   Don't prune the Resolved bucket yourself on every refresh — a separate periodic consolidation pass (see the companion `consolidate-memory` skill, if installed) handles trimming it over time. Just don't let it balloon: merge/update existing lines rather than duplicating, and keep entries terse.

   Every open-loop bullet, in all four buckets, should end with a short bracketed source tag so it's traceable without re-reading the file: `[Email: "<exact subject line>"]`, `[<chat app> #channel-name]`, `[<chat app> DM: <person's name>]`, `[<chat app> group DM: <names>]`, or `[<chat app> canvas/doc: <name>]`. If a bullet synthesizes multiple messages/threads, tag it with the most recent or most decision-relevant one, or list two tags separated by `; ` if both matter. When updating an existing item on a later refresh, replace the tag with the latest relevant source rather than stacking every historical one.
5. **Known recurring docs/canvases** (optional, only if relevant) — if the user maintains living documents outside plain messages (a Slack canvas for 1:1 notes, a shared doc for team status), list them by name and ID/link. Plain message search usually can't surface this kind of content, so recording the direct reference here saves every future session (especially the scheduled one in Part 3, and the on-demand one in Part 4) from having to re-search for it.

   If the chat app supports a canvas/live-doc primitive (e.g. Slack Canvases), consider setting up a dedicated **Open Loops canvas** as part of this system — see Part 3's optional canvas setup below. If one exists, record its ID/link here alongside any other recurring docs, since the scheduled task depends on reusing that exact ID rather than recreating it.

   If the user already maintains a **per-report or per-manager 1:1 canvas** (a running notes list for each direct report and their own manager), record each one's ID/link here too, keyed by person — Part 4 reuses these directly rather than creating separate ones. If a person in that set (direct reports + manager) doesn't have one yet, note that it's missing; Part 4 covers creating it.
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

A brain.md sitting in a folder isn't used automatically — in a standalone Cowork session, memory doesn't carry over between sessions, so nothing prompts a future Claude to go read it. Cowork Projects solve this: a Project has a persistent "Instructions" field that's read every session in that project, plus its own memory scoped to the project. Pointing a Project at the brain's folder with the right instructions is what actually makes this persistent and self-updating, instead of a file that only helps when someone remembers to attach it.

Read `assets/project-instructions-template.md` for the instructions text. Fill in its placeholders using what you already know from Part 1 (the user's name, the brain.md path, whether a recurring-docs/canvases section exists, whether a scheduled refresh task exists yet and its cadence — leave out any clause that doesn't apply rather than leaving a placeholder unfilled). Present the completed text to the user and tell them exactly where it goes:

1. Open the Projects panel and either create a new project ("+" → "Use an existing folder," pointed at the brain's folder) or open the existing project tied to that folder.
2. Find the project's Instructions field and paste the filled-in text there.

There's no tool available to create a Project or set its instructions programmatically — this is a manual step in the app. Your job is to get the copy-paste text exactly right, not to attempt the setup yourself.

---

## Part 3: Set up a scheduled refresh + summary task

This is what keeps the brain current without the user asking again: a recurring scheduled task that scans the last day's activity, updates brain.md, and sends a short summary.

The critical thing to understand and to tell the user if they're unfamiliar with scheduled tasks: each scheduled run is a brand-new session with zero memory of any previous run. It only knows what's in the prompt itself, plus whatever it reads from brain.md. That's exactly why brain.md matters here — without it, every run would start from zero, either repeating information or missing that something was already resolved. With it, each run reads yesterday's state and updates only what changed.

Per-person 1:1 prep (Part 4) is deliberately **not** part of this scheduled run by default — it's on-demand only, so it doesn't go stale between meetings or do wasted work for people the user isn't meeting soon. Don't fold it into the daily prompt unless the user explicitly asks for that.

### Step 1: Gather what the template needs

Most of this should already be sitting in brain.md's "Who I am" section from Part 1 — reuse it rather than re-asking: the user's name, email, chat-app user ID, and role. Also confirm:
- The brain.md path.
- Which email and chat-app tools are actually connected (load via ToolSearch and note the exact tool names — don't guess).
- Cadence (default: every weekday morning) and delivery destination (default: a self-DM, falling back to a direct message to their own user ID if that fails).

### Step 2: Fill in the template

Read `assets/scheduled-task-prompt-template.md` and substitute every placeholder. Don't leave a bracketed placeholder in the final prompt — either fill it in or, if a piece genuinely doesn't apply to this user's setup (e.g., no recurring docs/canvases exist yet), remove that section rather than leaving it dangling.

### Step 3: Confirm, then create

Show the user the filled-in prompt along with your proposed task name and cron schedule. Once they confirm, create it with `mcp__scheduled-tasks__create_scheduled_task` (load via ToolSearch if it's deferred). If they later want to change cadence or wording, use `mcp__scheduled-tasks__update_scheduled_task` rather than creating a duplicate.

### Optional: a live Open Loops canvas

If the connected chat app has a canvas/live-doc primitive (Slack Canvases are the common case), it's worth offering to set up a persistent **Open Loops canvas** — a checkbox list, attached to the user's self-DM, mirroring the memory file's Open Loops section (minus the Resolved bucket). This gives the user a way to resolve something themselves — just check the box — without it needing to show up anywhere in email/Slack first.

If the user wants this:
1. Create the canvas once (e.g. `slack_create_canvas`), attach it to their self-DM, and record its ID/link in the memory file's "Known recurring docs/canvases" section so no future run has to re-discover it.
2. Add the checkbox-resolution convention to the scheduled task prompt (see the template) — the run should read the canvas first and treat any checked box as resolved, then rewrite the canvas at the end with the current active loops.
3. Explain the convention to the user: check a box any time something's actually resolved (even with no trace in email/Slack), or just tell Claude directly in chat for an instant update instead of waiting for the next scheduled run.

Skip this entirely if the chat app has no canvas/live-doc equivalent — a plain scheduled summary is still useful without it.

---

## Part 4: On-demand 1:1 prep checklists

### What this produces

When the user says something like "prepare me for my weekly with [name]" — where `[name]` is a direct report or their manager — do the research as normal and answer in chat, but *also* persist the result as a checklist in a Slack canvas dedicated to that person, so it doesn't evaporate at the end of the conversation. This is deliberately scoped to direct reports + manager, not every recurring contact — those are the people the user has a standing 1:1 with and a natural place (their existing per-person canvas) to put it.

This is on-demand, not scheduled: it runs when asked, using whatever's fresh in email/Slack at that moment, and writes straight into Slack so it's there the next time the user opens that canvas — including from their phone, without needing to re-open a chat session.

### Step 1: Find or create the person's canvas

Check brain.md's "Known recurring docs/canvases" section (Part 1, Step 3.5) for that person's canvas ID. If the user already has a running 1:1-notes canvas for them, reuse it — add a new section rather than replacing their existing content.

If no canvas exists for that person yet:
1. Create one with the chat app's canvas-creation tool (e.g. `slack_create_canvas`), titled after the person (e.g. "Guy Kronenthal — 1:1").
2. Most canvas-creation tools don't attach the new canvas to a channel/DM as a tab automatically — tell the user it needs a one-time manual step (open the person's DM → add the canvas as a Canvas tab) and give them the canvas link.
3. Record the new canvas ID/link in brain.md's "Known recurring docs/canvases" section immediately, so it's never re-created on a future ask.

### Step 2: Do the research

Same approach as any other open-loop research: pull that person's recent email threads (`from:`/`to:` them) and Slack DM/channel history, cross-reference brain.md's Active Initiatives and Open Loops for anything tagged to them, and look specifically for things that haven't made it into brain.md yet (a live unanswered ask, a meeting agenda item, a deadline mentioned only in a thread) — these are often the most useful things to surface, precisely because they're not yet tracked anywhere else.

Group findings the same way brain.md's Open Loops are grouped — needs a decision/answer from them, status to check, FYI-only — since that's a structure the user already recognizes.

### Step 3: Write to chat AND to the canvas

Answer in chat as usual. Then write the same checklist into the canvas:
1. Call the canvas-read tool first to get a fresh `section_id_mapping` — section IDs change after every edit, never reuse one from an earlier turn.
2. Add or replace a section clearly marked as Claude's (e.g. a `## 🔎 Claude prep — next 1:1` heading) using the canvas-update tool. Never touch or overwrite the user's own pre-existing content in that canvas (e.g. their own running notes list) — only manage the section you created for this purpose.
3. Use plain unchecked checklist items (`- [ ]`) so the user can tick them off during or after the 1:1, same convention as the Open Loops canvas in Part 3.
4. Note the date the section was last refreshed, so a stale-looking checklist is self-evident before the next ask.

### Notes

- Keep this separate from the daily scheduled task (Part 3) unless the user explicitly asks to fold it in — see the note in Part 3. Running it daily for every person would mean stale, unread checklists piling up for people the user isn't meeting that week, and duplicates a lot of what the Open Loops canvas already covers in aggregate.
- If the user wants this for someone outside the direct-report/manager set (a peer, a cross-functional partner with a standing 1:1), it's fine to do the same thing for them — just confirm first, since brain.md's canvas registry is keyed by person and unscoped growth here can get noisy fast.
