// HTTP routes for the payments service.
const BASE_PATH = '/payments';

const routes = [
  { method: 'POST', path: `${BASE_PATH}/withdraw`, handler: 'withdraw' },
  { method: 'POST', path: `${BASE_PATH}/refund`, handler: 'refund' },
];

module.exports = { BASE_PATH, routes };
