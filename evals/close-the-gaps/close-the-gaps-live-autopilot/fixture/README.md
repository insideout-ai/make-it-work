# Mini Order Tracker

A tiny internal tool for tracking customer orders through their lifecycle.

## Status lifecycle

Orders move through `draft -> pending -> shipped -> cancelled`. See `src/orders/status.js`
for the exact transition rules.
