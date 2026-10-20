# Spec: UI-500 — Prevent repeated approval submissions

## Business goal

Avoid accidental duplicate approvals while an approval request is in flight.

## Requirements

Update src/PurchaseForm.jsx to show Pending and disable Approve while its fetch
is pending. Restore the control and display success or failure when it settles.
Repeated clicks during a pending request must cause only one request. Arithmetic
in src/lib/lineTotal.js is unchanged. Backend work is out of scope.

## Acceptance Criteria

1. Given valid inputs, submitting shows Pending and disables Approve until the
   response arrives.
2. Additional clicks while pending do not send another request.
3. A successful response displays Approved; a failed request displays Approval
   failed; either restores the control for another valid submission.
