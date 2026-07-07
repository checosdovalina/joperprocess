---
name: drizzle-kit push needs a TTY
description: Why `npm run db:push` stalls on new tables and the reliable fallback
---

`npm run db:push` (drizzle-kit) prompts interactively when it detects a *new* table
("Is X created or renamed from another table?"). This prompt is an arrow-key TUI that
requires a real TTY — piping (`printf '\n' |`) and `--force` do NOT dismiss it, so the
command just stalls re-rendering the prompt.

**How to apply:** When adding a brand-new table and push stalls on the create/rename
prompt, create the table directly with SQL via the executeSql callback (matching the
Drizzle column types), then continue. Existing-column ALTERs usually push fine
non-interactively; only the create-vs-rename disambiguation blocks.
