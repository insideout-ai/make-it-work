function completeTask(task) {
  if (task.status === 'done') {
    throw new Error('task already complete');
  }
  return { ...task, status: 'done', completedAt: new Date().toISOString() };
}

module.exports = { completeTask };
