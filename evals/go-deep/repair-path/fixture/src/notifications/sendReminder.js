function sendReminder(task, { isAdmin }) {
  if (!task.dueAt) return null;
  const overdue = new Date(task.dueAt) < new Date();
  if (!overdue) return null;
  return {
    taskId: task.id,
    message: `Task "${task.title}" is overdue`,
    escalated: Boolean(isAdmin),
  };
}

module.exports = { sendReminder };
