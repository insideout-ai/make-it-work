import React, { useState } from 'react';
import { lineTotal } from './lib/lineTotal.js';

export function PurchaseForm({ budget = 1000 }) {
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(100);
  const [status, setStatus] = useState('');
  const total = lineTotal(quantity, price);
  const overBudget = total > budget;
  const invalid = quantity <= 0 || price <= 0 || overBudget;
  async function submit(event) {
    event.preventDefault();
    if (invalid) return;
    const response = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quantity, price }),
    });
    setStatus(response.ok ? 'Approved' : 'Approval failed');
  }
  return (
    <form onSubmit={submit}>
      <label>Quantity<input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></label>
      <label>Price<input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} /></label>
      <output>Total: {total}</output>
      {overBudget && <p role="alert">Over budget</p>}
      <button disabled={invalid}>Approve</button>
      <p role="status">{status}</p>
    </form>
  );
}
