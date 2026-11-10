const { emitTaskEvent } = require("../events/taskEvents");

function completeTask(task) {
  if (task.status !== "open") throw new Error("only open tasks can be completed");
  task.status = "done";
  task.completedAt = Date.now();
  // Pattern B: cross-cutting behavior on task state changes is broadcast as an event,
  // which the notifications module (and any other subscriber) reacts to independently.
  emitTaskEvent("task.completed", task);
  return task;
}

module.exports = { completeTask };
