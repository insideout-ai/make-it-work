---
tags: [shape-the-epic, smoke]
allowed_tools: [Write, Edit, Read, AskUserQuestion]
max_turns: 60
timeout_seconds: 900
runs: 1
---

/make-it-work:shape-the-epic --autopilot

Epic title: Saved Search Alerts

Idea: Today, job seekers on our platform have to come back to the site and re-run the same search every day to see new matching listings. We want to let a logged-in job seeker save a search (keywords + location + filters) and get notified by email when new listings match it, so they stop missing postings and keep coming back to the platform.

Context I already have:
- This is for our free tier, not a paid upsell — it's meant to increase daily email open rates and repeat visits, not revenue directly.
- Success looks like: at least 20% of active job seekers create one saved search alert within their first month after launch, and saved-search users should have a 2x higher 7-day return rate than non-saved-search users. We'll need to track alert creation events and return visits tied to an alert email click to measure that.
- Users: just the regular "job seeker" role on the consumer side. No internal admin UI is in scope for this epic — alerts are entirely self-managed by the user who created them, and nobody else (not even support staff) can view or edit another user's alerts through this feature.
- A job seeker can create, pause, edit the filters of, and delete their own saved search alert from their account settings page or directly from a search results page.
- Alerts are checked once per day in a nightly batch job; matching new listings posted since the last run get bundled into a single digest email per saved search, not one email per listing.
- If a saved search matches zero new listings on a given day, no email is sent that day — we don't want to spam people with empty digests.
- A job seeker can have up to 10 active saved searches at a time; trying to create an 11th should show an error telling them to delete one first before adding a new one.
- We're rolling this out to 100% of users at once — there's no separate paid tier, waitlist, or regional rollout, and it ships as one release with no feature flag needed.
- Done means: a job seeker can create a saved search from any search results page, see all of their saved searches listed in account settings, receive a digest email when new listings match, and pause/edit/delete any of their own alerts from account settings — all shipped behind standard code review and QA sign-off, with no further internal milestone after that.

I don't have a PRD doc or any other links to share — this covers everything I know at this point.
