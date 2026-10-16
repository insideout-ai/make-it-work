function sendReminder(task, now = new Date()) {
  if (!task.dueDate) return null;
  if (new Date(task.dueDate) > now) return null;
  return { taskTitle: task.title, escalateTo: "on-call", sentAt: now };
}

module.exports = { sendReminder };
