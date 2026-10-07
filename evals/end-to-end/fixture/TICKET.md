# DEMO-101 — Allow administrators to proceed

Administrators need access to the same policy-protected action currently
available to members. Keep guest access denied.

Acceptance criteria:

- Given an administrator, when the policy is checked, then access is allowed.
- Given a member, when the policy is checked, then access stays allowed.
- Given a guest, when the policy is checked, then access stays denied.
