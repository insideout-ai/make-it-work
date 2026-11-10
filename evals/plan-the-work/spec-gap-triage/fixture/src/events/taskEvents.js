const listeners = {};

function onTaskEvent(eventName, handler) {
  listeners[eventName] = listeners[eventName] || [];
  listeners[eventName].push(handler);
}

function emitTaskEvent(eventName, task) {
  for (const handler of listeners[eventName] || []) {
    handler(task);
  }
}

module.exports = { onTaskEvent, emitTaskEvent };
