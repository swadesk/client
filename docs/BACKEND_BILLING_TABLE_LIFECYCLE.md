# Backend: Table billing lifecycle & avoiding duplicate bills/invoices

The **Tables** UI only shows **Collect payment** and **Create invoice** when `table.status === "Billing"`. After a successful payment, the frontend expects the **table to leave billing** and **bills/invoices** to settle cleanly. If the API keeps the table in `Billing` or creates a new bill/invoice on every action, staff will see wrong buttons and duplicate rows.

---

## 1) When payment completes (`POST /api/billing/pay`)

1. Update the **bill**: `paidCents`, `dueCents`, `status` (`PAID` when fully settled).
2. **Close the billing session** for that table:
   - Set **`table.status`** to `Available` (or `Occupied` if you keep guests seated) — **not** `Billing`.
   - Optionally clear or archive the active bill link on the table so `GET /api/billing/:tableId` returns **`bill: null`** or a **new** bill only when a new order/session starts.
3. Ensure `GET /api/billing/:tableId` after full payment returns either:
   - `bill: null`, or  
   - `bill` with `status: "PAID"` and `dueCents: 0`  
   so the frontend can close the payment drawer and hide table actions.

---

## 2) Idempotent table invoice (`POST /api/billing/table/:tableId/invoice`)

- If an invoice **already exists** for the **current open bill** (or the latest bill for that table), return **200** with the **same** invoice (same `invoiceNumber` / `id`), **do not** create a second row.
- Only create a **new** invoice when none exists for the bill you’re invoicing.

This prevents duplicate invoices when staff tap **Create invoice** twice or use both the table card and the billing drawer.

---

## 3) Billing list (`GET /api/billing`)

- Avoid returning **multiple active OPEN rows** for the same table/session unless intentional (e.g. split bills).  
- Completed sessions should appear as history with `status: PAID` (or omitted from “open” filters).

---

## 4) Quick checklist

| Symptom | Likely backend fix |
|--------|---------------------|
| Table stays **Billing** after full pay | Transition `table.status` when bill is fully paid. |
| **Collect payment** still shows | Same as above; `GET` billing by table should not imply an unpaid bill. |
| Duplicate **invoices** | Idempotent `POST .../table/:tableId/invoice` for the same bill. |
| Duplicate **bills** in list | One open bill per table/session; close or PAID when done. |

The frontend **cannot** fix stale `table.status` or duplicate records without correct API behavior.
