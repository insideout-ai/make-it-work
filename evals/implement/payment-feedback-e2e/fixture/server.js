const http = require('node:http');
const sessions = require('./src/data');
const { renderDashboard, renderSessions } = require('./src/views');
const server = http.createServer((req,res) => {
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end('<!doctype html><html><head><style>.hover-details{display:none}.session-line:hover .hover-details{display:block}td{padding:8px}</style></head><body>' +
    (req.url === '/sessions' ? renderSessions(sessions) : renderDashboard(sessions)) + '</body></html>');
});
server.listen(Number(process.env.PORT || 0), '127.0.0.1', () => {
  console.log(`Sessions app: http://127.0.0.1:${server.address().port}`);
});
