const { addTask } = require('./taskRepo');

let nextId = 1;

function createTask(title, ownerId) {
  if (!title) {
    throw new Error('title is required');
  }
  const task = {
    id: nextId++,
    title,
    ownerId,
    assignedTo: ownerId,
    status: 'open',
    deletedAt: null,
  };
  addTask(task);
  return task;
}

module.exports = { createTask };
