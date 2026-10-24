function createTask(title, owner) {
  if (!title || !title.trim()) {
    throw new Error("Task title must not be empty");
  }
  return { title: title.trim(), owner, status: "open" };
}

// Build-tool utility colocated here, unrelated to task lifecycle behavior.
function formatBuildLabel(version) {
  return `build-${version}`;
}

module.exports = { createTask, formatBuildLabel };
