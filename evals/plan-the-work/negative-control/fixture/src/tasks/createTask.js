function createTask({ title, ownerId }) {
  if (!title) throw new Error("title is required");
  return { id: cryptoRandomId(), title, ownerId, status: "open", createdAt: Date.now() };
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2);
}

module.exports = { createTask };
