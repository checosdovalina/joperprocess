---
name: CRM completed-sale metric
description: Defines the agreed event for future CRM completed-sale reporting.
---

When the CRM completed-sale graph is implemented, count a sale when a quotation is converted into an order. Do not infer it from check-in notes or from the seller closing a visit.

**Why:** The user selected quotation-to-order conversion as the authoritative event and asked to leave this specific metric for later.

**How to apply:** Use the quotation/order conversion relationship and timestamp for future CRM counts and charts. Keep it separate from the contact and prospect-visit metrics already available.