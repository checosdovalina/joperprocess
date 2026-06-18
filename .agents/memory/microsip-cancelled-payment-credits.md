---
name: Microsip cancelled-payment phantom credits
description: CXC balance/credit queries must exclude credits whose source payment document is cancelled.
---

## Rule
Any Firebird CXC query that sums applied credits from `IMPORTES_DOCTOS_CC` (rows where `DOCTO_CC_ACR_ID IS NOT NULL AND TIPO_IMPTE <> 'C'`) MUST join back to the parent payment document `DOCTOS_CC` on `DOCTO_CC_ID` and filter `CANCELADO <> 'S'`.

**Why:** When a payment/receipt is cancelled in Microsip, its document row gets `CANCELADO = 'S'`, but the application rows in `IMPORTES_DOCTOS_CC` (which link the payment to an invoice via `DOCTO_CC_ACR_ID`) are NOT deleted. Microsip's own reports ignore them; a naive credit sum counts them, under-stating the balance. Real incident: client DUALA showed $236,516.83 in Nexxo vs $289,876.83 in the Microsip auxiliar — exactly one cancelled $53,360 receipt (folio 000015560, CANCELADO='S') that was still applied to invoice IL0010798 alongside its valid twin (folio 000015567).

**How to apply:** Filtering the charge document's `CANCELADO` is not enough — the cancelled flag that matters is on the PAYMENT document. The credit subquery/CTE needs its own join+filter. Applies to every balance path: the summary list (`queryLiveAccountStatements`), the per-customer PDF detail (`queryLiveCxcStatementForCustomer`), and any diagnostic. The `CANCELADO <> 'S'` filter on the charge side does not cover this.
