function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
function buildSessionDetails(session) {
  return [session.description, `Session: ${formatDate(session.date_start) || 'Unknown'}`,
    session.payment_received ? 'Payment received' : 'Awaiting payment'];
}
module.exports = { formatDate, buildSessionDetails };
