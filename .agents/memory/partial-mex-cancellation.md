---
name: Partial MEX cancellation
description: Business rule for cancelling the unfulfilled balance of an order after partial releases.
---

Cancelling a partially fulfilled MEX means cancelling only equipment quantities not yet released. Keep prior releases, invoices, and shipments intact; record what remained at cancellation and prevent later fulfillment from changing the terminal order state.

**Why:** The user needs to stop delivery of the remaining equipment without erasing the history of items already sent. Automatically voiding invoices or payments would incorrectly affect completed financial transactions.

**How to apply:** Calculate the remaining quantities from original order items minus releases at the time of cancellation, and serialize cancellation with release/shipment creation. Any financial reversal of an already issued invoice is a separate accounting operation.