// A user's role on an order. Today the only recognized role is "owner" —
// the person who placed the order. There is no "admin" concept in this
// codebase at all.
function makeUser({ id, name }) {
  return { id, name, role: 'owner' };
}

module.exports = { makeUser };
