// Pattern A: this module instead reads task fields directly and makes its own
// overdue decision inline, rather than reacting to an event. Two different
// extension patterns already coexist in this small codebase (see
// src/events/taskEvents.js for the event-based alternative used by completeTask.js).
function isOverdue(task, now = Date.now()) {
  return task.status === "open" && task.dueAt != null && task.dueAt < now;
}

function sendReminder(task, notifier) {
  if (!isOverdue(task)) return false;
  notifier.send(task.ownerId, `Task "${task.title}" is overdue.`);
  return true;
}

module.exports = { isOverdue, sendReminder };
