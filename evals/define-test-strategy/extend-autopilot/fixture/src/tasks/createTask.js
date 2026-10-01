function createTask(title, owner) {
  if (!title || !title.trim()) {
    throw new Error("Task title must not be empty");
  }
  return { title: title.trim(), owner, status: "open" };
}

module.exports = { createTask };
