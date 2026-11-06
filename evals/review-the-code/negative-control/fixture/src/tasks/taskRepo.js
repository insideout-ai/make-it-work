// In-memory stand-in for a tasks table.
const tasks = [];

function addTask(task) {
  tasks.push(task);
}

// The only sanctioned way to look up a single task by id: filters out
// soft-deleted rows and applies a deterministic order before taking one.
function getTaskById(id) {
  const matches = tasks
    .filter((t) => t.id === id && t.deletedAt === null)
    .sort((a, b) => a.id - b.id);
  return matches[0] || null;
}

module.exports = { tasks, addTask, getTaskById };
