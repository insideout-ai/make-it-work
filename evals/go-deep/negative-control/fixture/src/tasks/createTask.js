function createTask({ title, ownerId }) {
  if (!title) throw new Error('title is required');
  return {
    id: generateId(),
    title,
    ownerId,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

module.exports = { createTask };
