function completeTask(task) {
  if (task.status === "done") {
    throw new Error("Task is already done");
  }
  return { ...task, status: "done" };
}

module.exports = { completeTask };
