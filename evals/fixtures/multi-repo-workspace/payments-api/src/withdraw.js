// Withdraw `amount` from `balance`, enforcing the per-withdrawal velocity limit.
const MAX_WITHDRAWAL = 1000;

function withdraw(balance, amount) {
  if (!(amount > 0)) throw new Error('amount must be positive');
  if (amount > MAX_WITHDRAWAL) throw new Error('velocity limit exceeded');
  if (amount > balance) throw new Error('insufficient funds');
  return balance - amount;
}

module.exports = { withdraw, MAX_WITHDRAWAL };
