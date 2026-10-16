---
name: uc-08-withdraw-money
description: "Withdrawing money from an account via POST /payments/withdraw. Use when changing withdrawal validation, balance checks or limits."
---

## Summary

A customer withdraws an amount from their balance. The withdrawal is rejected when the amount is not positive, exceeds the velocity limit, or exceeds the balance.

## Cross-references

- Related Domain Skills: `/domain-velocity`
