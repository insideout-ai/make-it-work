function completeTask(task) {
  if (task.status !== "open") throw new Error("only open tasks can be completed");
  task.status = "done";
  task.completedAt = Date.now();
  return task;
}

module.exports = { completeTask };
