function createTask({ title, ownerId }) {
  if (!title) throw new Error("title is required");
  return { id: randomId(), title, ownerId, status: "open", createdAt: Date.now() };
}

function randomId() {
  return Math.random().toString(36).slice(2);
}

module.exports = { createTask };
