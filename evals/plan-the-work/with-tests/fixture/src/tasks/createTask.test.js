const test = require("node:test");
const assert = require("node:assert/strict");
const { createTask } = require("./createTask");

test("createTask creates an open task with the given title and owner", () => {
  const task = createTask({ title: "Buy milk", ownerId: "u1" });
  assert.equal(task.title, "Buy milk");
  assert.equal(task.ownerId, "u1");
  assert.equal(task.status, "open");
});

test("createTask throws when title is missing", () => {
  assert.throws(() => createTask({ ownerId: "u1" }), /title is required/);
});
