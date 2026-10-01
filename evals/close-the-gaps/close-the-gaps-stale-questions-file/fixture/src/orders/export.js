// Exports a user's orders as CSV.
// Current limit: exports are capped at 100 rows per request.
const EXPORT_ROW_LIMIT = 100;

function exportOrders(orders) {
  return orders.slice(0, EXPORT_ROW_LIMIT);
}

module.exports = { EXPORT_ROW_LIMIT, exportOrders };
