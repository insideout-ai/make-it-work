import { createServer } from 'node:http';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const server = createServer(async (request, response) => {
  const send = (status, body) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  };
  if (request.method !== 'POST' || request.url !== '/reservations') {
    return send(404, { error: 'Not found' });
  }
  let body = '';
  for await (const chunk of request) body += chunk;
  let input;
  try { input = JSON.parse(body); }
  catch { return send(400, { error: 'Invalid JSON' }); }
  if (typeof input?.seat !== 'string' || !input.seat.trim()) {
    return send(400, { error: 'Seat required' });
  }
  try {
    await pool.query('INSERT INTO reservations (seat) VALUES ($1)', [input.seat.trim()]);
    send(201, { seat: input.seat.trim() });
  } catch (error) {
    send(error.code === '23505' ? 409 : 500, { error: 'Reservation failed' });
  }
});
server.listen(Number(process.env.PORT || 3000), '127.0.0.1');
