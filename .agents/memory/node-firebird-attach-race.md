---
name: node-firebird concurrent attach race
description: Why overlapping Firebird.attach() calls throw false credential errors and how connections must be serialized
---

`node-firebird`'s wire handshake uses shared per-process state, so when two
`Firebird.attach()` calls overlap in time the handshake corrupts and one of them
fails with the misleading error: "Your user name and password are not defined.
Ask your database administrator to set up a Firebird login". Credentials are fine —
it is a concurrency bug, not an auth bug.

**Symptom fingerprint:** one sync type (e.g. products) fails with that error at the
exact timestamp another sync type (e.g. invoices/payments) succeeds. In Nexxo the
trigger was a manual sync overlapping the account-statement scheduler's pre-send
Microsip refresh (two separate service instances → two concurrent attaches).

**Fix / how to apply:** serialize ALL attaches process-wide with a module-level
promise-chain mutex. Advance the lock only when the real attach callback fires
(not when a caller-facing timeout expires), with a hard cap to avoid deadlock, and
detach any handle that arrives after the caller already timed out (else it leaks).
Serializing attach alone is enough — queries/detach on already-open connections do
not race. Never parallelize Microsip syncs with Promise.all across attaches.
