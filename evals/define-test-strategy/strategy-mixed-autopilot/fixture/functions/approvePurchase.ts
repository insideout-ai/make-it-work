import { platformRequest } from './platformClient.ts';

Deno.serve(async request => {
  const authorization = request.headers.get('authorization') || '';
  const user = await platformRequest('/me', authorization);
  if (user.role !== 'accountant') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { quantity, price } = await request.json();
  const amount = quantity * price;
  if (!Number.isFinite(amount) || quantity <= 0 || price <= 0 || amount > 1000) {
    return Response.json({ error: 'Invalid amount' }, { status: 400 });
  }
  try {
    const payment = await platformRequest('/payments', authorization, { amount });
    return Response.json({ id: payment.id, amount }, { status: 201 });
  } catch {
    return Response.json({ error: 'Payment failed' }, { status: 502 });
  }
});
