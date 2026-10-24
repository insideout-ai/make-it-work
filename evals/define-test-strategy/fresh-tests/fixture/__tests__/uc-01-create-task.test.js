const test = require("node:test");
const assert = require("node:assert/strict");
const { createTask, formatBuildLabel } = require("../src/tasks/createTask");

test("creates a task with a trimmed title and open status", () => {
  const task = createTask("  Buy milk  ", "alice");
  assert.equal(task.title, "Buy milk");
  assert.equal(task.status, "open");
});

test("rejects an empty title", () => {
  assert.throws(() => createTask("   ", "alice"));
});

test("formats a build label", () => {
  assert.equal(formatBuildLabel("1.2.3"), "build-1.2.3");
});
