---
name: Statement recipient selection
description: Safety rule for choosing customer email recipients for automatic account statements.
---

Once a customer’s account-statement recipients have been explicitly configured, that selection is authoritative. If selected addresses later disappear from the customer’s registered emails, send to nobody and surface the missing configuration; never silently fall back to every registered address.

**Why:** Falling back after an address change can disclose financial information to a newly added contact who was never approved to receive it.

**How to apply:** Keep a separate configured/unconfigured marker. Legacy unconfigured customers may retain compatibility fallback, while configured customers must use only the valid intersection of their saved selection and current registered addresses.