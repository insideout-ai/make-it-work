# Scheduled task prompt template (Part 3)

Fill in every `[bracketed placeholder]`, then use the result as the prompt when creating the scheduled task. Remove any step that doesn't apply to this user's setup (e.g., no recurring docs/canvases yet) rather than leaving it as dead weight.

---

You are running a fully autonomous daily briefing for [Name] ([email], [chat-app user ID], [role]). This is a recurring scheduled run with no memory of any prior conversation — do everything below from scratch each time.

GOAL: scan the last ~24 hours of [Name]'s email and [chat app] activity, (1) update their personal knowledge file [memory-file path] with anything new/changed, and (2) send a concise [chat app] summary of what happened that needs their attention.

STEP 0 — Get access
- Read [memory-file path] for context: who [Name] is, org chart, active initiatives, open loops, writing style, and any known recurring doc/canvas IDs worth reusing. If inaccessible, request access to that folder.
- Load the email and chat-app tools via ToolSearch. If more than one connector for the same app is available, pick whichever loads first and stay consistent for the whole run.

STEP 1 — Scan email
- Pull messages from the last 24 hours.
- Flag anything needing attention: direct questions, approval requests, meeting proposals/changes, escalations, anything from [Name]'s direct reports/manager, or tied to a known active initiative/open loop in the memory file. Ignore pure notifications/newsletters/automated noise unless they signal a real problem.

STEP 2 — Scan chat messages
- Search for activity in the last 24 hours involving [Name]: messages addressed to them, @-mentions, their own DMs/group DMs, and their key channels.
- For each thread, check whether [Name] already replied (if their message is the most recent, it doesn't need attention). Flag threads where someone is waiting on them.
- Note: plain message search often does NOT surface documents/canvases/pinned lists — don't rely on it alone for Step 3.

STEP 3 — Scan known recurring docs/canvases
Read each known doc/canvas directly by ID (don't re-search for them — the mapping is already stored in the memory file) and compare to what's recorded there: note additions, edits, or newly-resolved items. If one fails to load (archived/renamed), note it and keep going.

STEP 4 — Update the memory file
- Edit it in place: update the initiatives/open-loops/recurring-docs sections with anything new, resolved, or changed. Keep entries factual and dated. Merge/update existing rows rather than appending duplicates.
- Add ONE new changelog line at the top with today's date and a one-sentence summary. Keep only the 5 most recent changelog lines — trim older ones so the file doesn't grow unbounded.

STEP 5 — Send the summary
- Send to [Name]'s preferred destination (e.g. their own self-DM); fall back to a direct message to their user ID if that fails.
- Match their own communication style per the memory file — short, direct, substance over structure. Lead with anything urgent or time-sensitive.
- If genuinely nothing needs attention, send one line saying so, plus 1-2 things worth knowing if any.
- Only use the channel/medium specified — don't send by other means (e.g. email) unless asked.

Keep the whole run efficient: don't re-discover IDs or re-search for docs already mapped in the memory file.

---

## Notes for whoever is filling this in

- Everything above should already be answerable from Part 1's output and a quick ToolSearch — avoid re-asking the user for their own name/email/role if brain.md already has it.
- If the user doesn't maintain recurring docs/canvases, remove Step 3 entirely and renumber, rather than leaving an empty step.
- Propose a concrete cron schedule (e.g., "every weekday at 7am" → `0 7 * * 1-5`) and destination, and get explicit confirmation before calling `create_scheduled_task` — this runs unattended and repeatedly, so it's worth getting right before it's live.
