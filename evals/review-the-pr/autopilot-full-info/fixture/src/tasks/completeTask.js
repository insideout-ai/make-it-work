const { getTaskById } = require('./taskRepo');

function completeTask(id) {
  const task = getTaskById(id);
  if (!task) {
    throw new Error('task not found');
  }
  if (task.status === 'done') {
    throw new Error('task already complete');
  }
  task.status = 'done';
  task.completedAt = new Date().toISOString();
  return task;
}

module.exports = { completeTask };
