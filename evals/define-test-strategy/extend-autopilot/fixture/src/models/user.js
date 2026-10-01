function makeUser(name, role) {
  // role is one of "owner" (created the task) or "admin" (handles escalations);
  // whether these are the same role or distinct is not yet formally decided.
  return { name, role };
}

module.exports = { makeUser };
