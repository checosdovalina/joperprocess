---
name: Customer-specific statement seller
description: Precedence and scope of a seller assigned to one customer's statement copies.
---

Allow a customer-specific seller for automatic statement copies; use the Microsip zone's seller only when the customer has no specific assignment.

**Why:** The user approved this approach because multiple sellers may attend different customers in the same Microsip zone.

**How to apply:** Keep the assignment in Nexxo; customer synchronization must not overwrite it or write it to Microsip. An assigned seller who opts out or becomes inactive must not cause automatic fallback to a different seller. This assignment controls statement copies, not access permissions or sales ownership elsewhere.
