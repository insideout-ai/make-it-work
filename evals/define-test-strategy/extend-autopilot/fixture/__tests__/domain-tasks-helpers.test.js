const test = require("node:test");
const assert = require("node:assert/strict");
const { deleteTask } = require("../src/tasks/deleteTask");

test("domain-tasks: deleteTask removes the matching task by title", () => {
  const tasks = [{ title: "a" }, { title: "b" }];
  const result = deleteTask(tasks, "a");
  assert.deepEqual(result, [{ title: "b" }]);
});
