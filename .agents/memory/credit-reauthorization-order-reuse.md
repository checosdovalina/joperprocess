---
name: Credit reauthorization order reuse
description: Rules for safely moving a rejected credit authorization back into the order-release workflow.
---

A credit reapproval must atomically reuse the quotation's existing order. Only a release-rejected order in a still-active production state may return to pending release; closed, cancelled, shipped, or delivered orders must not reopen automatically.

**Why:** Creating another order for the same quotation splits one MEX across pending and rejected queues, making it appear missing. Updating authorization separately can also leave an approved authorization without a valid order.

**How to apply:** Serialize the authorization/order transition per quotation and commit authorization, order reopening or creation, and quotation linking in one transaction. Treat repeated approval requests as idempotent.