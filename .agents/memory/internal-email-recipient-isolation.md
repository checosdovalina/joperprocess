---
name: Internal email recipient isolation
description: Rules for selecting internal users for automatic notification emails.
---

Automatic emails to administrators or other internal roles must include only active users from the document's tenant whose email-notification preference is enabled.

**Why:** A global administrator lookup caused users from one company to receive another company's emails, and account status alone could not represent an administrator who needs access but no notifications.

**How to apply:** Use tenant-scoped recipient selection for every automatic internal notification. Respect opt-out for administrators, sellers, and other staff, while leaving explicitly entered customer or one-time recipient lists unchanged.