// Exports a user's orders as CSV.
// Current limit: exports are capped at 100 rows per request. There is no
// file-format option today -- exportOrders always hands back a plain array,
// and there is no date-range filtering anywhere in this module.
const EXPORT_ROW_LIMIT = 100;

function exportOrders(orders) {
  return orders.slice(0, EXPORT_ROW_LIMIT);
}

module.exports = { EXPORT_ROW_LIMIT, exportOrders };
