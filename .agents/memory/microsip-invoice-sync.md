---
name: Microsip invoice sync query
description: Correct Firebird query fields and filters for the JoperProcess tenant Microsip installation.
---

## Rule
Filter open invoices with `DV.IMPORTE_COBRO > 0`, not `DV.SALDO > 0`.

**Why:** The `SALDO` column does not exist in this Firebird installation (returns SQL error -206 "Column unknown"). `IMPORTE_COBRO` is the amount pending to collect and is effectively 0 for fully-paid invoices, making it the correct filter. Without this filter the query returns 38,000+ historical records since 2001.

**How to apply:** Any change to the invoice sync SQL must use `AND DV.IMPORTE_COBRO > 0` in the WHERE clause. Use `IMPORTE_COBRO` as both `total` and `balanceDue` in the Nexxo record; the payment sync will refine `balanceDue` further.

## Result
With `IMPORTE_COBRO > 0`: ~629 invoices returned (correct). Without it: ~38,186 records.
