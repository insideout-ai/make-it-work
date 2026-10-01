// Order status lifecycle.
//
// Valid statuses: draft, pending, shipped, cancelled.
// Valid transitions: draft -> pending -> shipped -> cancelled.
// Only an order's "owner" may cancel it. There is no separate "admin" role
// anywhere in this module or in the user model.
const ORDER_STATUSES = ['draft', 'pending', 'shipped', 'cancelled'];

function cancelOrder(order, actor) {
  if (order.status !== 'pending' && order.status !== 'shipped') {
    throw new Error('Only pending or shipped orders can be cancelled');
  }
  if (actor.role !== 'owner') {
    throw new Error('Only the order owner can cancel an order');
  }
  order.status = 'cancelled';
  return order;
}

function listActiveOrders(orders) {
  // "Active" today means anything that isn't cancelled.
  return orders.filter((order) => order.status !== 'cancelled');
}

module.exports = { ORDER_STATUSES, cancelOrder, listActiveOrders };
