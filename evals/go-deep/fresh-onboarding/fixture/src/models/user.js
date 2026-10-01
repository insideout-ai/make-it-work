function createUser({ name, role }) {
  // Task creation treats the creator as "owner"; reminder escalation checks
  // for "admin" (see sendReminder's isAdmin flag). Nothing here states whether
  // these are two distinct roles or just two names for the same thing.
  return { id: generateId(), name, role: role || 'owner' };
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

module.exports = { createUser };
