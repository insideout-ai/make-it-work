const { tasks } = require('./taskRepo');

// TASK-100: clear the assignee on completion so the task returns to the pool.
function completeTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    throw new Error('task not found');
  }
  if (task.status === 'done') {
    throw new Error('task already complete');
  }
  task.status = 'done';
  task.completedAt = new Date().toISOString();
  task.assignedTo = null;
  return task;
}

module.exports = { completeTask };
