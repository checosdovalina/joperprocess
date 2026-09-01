---
name: Firebird chained auth and product sync
description: Non-obvious Firebird authentication behavior and performance constraints for Microsip synchronization.
---

Some older Microsip databases on the same Firebird server can complete SRP and then request a second `Legacy_Auth` verification. The node-firebird handshake may have no `_pendingAccept` after `op_accept_data`, even though the accepted SRP state is still on the connection; chained-auth handling must account for that state.

**Why:** Newer databases can finish after SRP while older databases follow the chained path, so one global authentication choice does not work for every database.

**How to apply:** Keep the reproducible node-firebird compatibility patch installed after dependency installation, and verify logs for both SRP completion and the Legacy_Auth continuation before treating a timeout as a network or path failure.

Large Microsip product catalogs must preload tenant products and perform inserts/updates/deactivations in bounded batches. Per-product PostgreSQL lookups and sequential writes make synchronization appear stuck.

**Why:** Product synchronization previously multiplied network round trips by the catalog size.

**How to apply:** Preserve tenant scoping, code-collision safety, historical inactive rows, and valid zero prices while batching catalog writes.