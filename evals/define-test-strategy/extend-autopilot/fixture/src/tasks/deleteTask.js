function deleteTask(tasks, title) {
  const index = tasks.findIndex((t) => t.title === title);
  if (index === -1) {
    throw new Error("Task not found");
  }
  return tasks.filter((_, i) => i !== index);
}

module.exports = { deleteTask };
