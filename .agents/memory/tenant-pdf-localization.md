---
name: Tenant PDF localization
description: Durable locale rule for every server-generated tenant PDF.
---

All fixed, system-generated PDF text follows the tenant locale: any locale beginning with `en` uses English with `en-US` formatting; missing or unknown values use Spanish with `es-MX` formatting. User-entered customer, product, Microsip, and free-form text is never translated.

**Why:** Joper USA needs every document in English while Grupo Joper must remain in Spanish, and a safe Spanish fallback preserves existing tenant behavior.

**How to apply:** Any new PDF generator or route-created PDF fallback text must resolve language from the full tenant record and use the shared PDF locale helpers. Treat date-only values as calendar dates so timezone conversion cannot move them to the prior day.