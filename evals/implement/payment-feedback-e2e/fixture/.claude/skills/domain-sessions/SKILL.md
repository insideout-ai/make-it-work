---
name: domain-sessions
description: Session dates, billing status and display conventions.
---

# Sessions domain

A session has id, description, date_start, payment_received and optional payment_date.
Display date_start as the session date. payment_date, when valid, is the date
payment was received, not a due date. Unpaid records may have stale payment_date
values. Paid records may lack a payment date. Shared display helpers are in
`src/sessionDetails.js`; view renderers escape all user text. Dates use UTC.
