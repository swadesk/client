# Backend: Guest place-order merge (table session)

Guest QR checkout calls `POST /api/customer/order` with `restaurantId`, `tableCode`, and `lines`. **Append vs replace is server-side:** resolve the table, find the **active open** order/bill for that table session, and **merge** new lines into it until the bill is fully paid and the table session closes. See also [BACKEND_BILLING_TABLE_LIFECYCLE.md](./BACKEND_BILLING_TABLE_LIFECYCLE.md).

---

## 1) Merge policy (`POST /api/customer/order`)

1. Resolve `tableCode` → internal `tableId` for `restaurantId`.
2. If an **open** order and/or **open** bill exists for that table (session not checked out), **merge** `lines`:
   - Same `itemId`: add quantities.
   - New `itemId`: append line.
   - Return the **same** stable `orderId` when the guest is extending the same session (or document clearly if you issue a new revision id).
3. If **no** open session (table available / bill `PAID` / no open order), **create** a new order (and bill as your domain requires).
4. **Idempotency** (same `idempotencyKey`): replay the **same** outcome; do not treat a replay as a second merge. Merging applies to **distinct** successful submits.

**Authoritative target:** one active session per dine-in table until checkout; **do not** void or replace the entire previous order on each guest submit unless product defines a separate “replace cart” flow.

---

## 2) Request field (whitelist)

The guest app sends **`mergeIntoOpenSession: true`** on every `POST /api/customer/order` unless the deploy sets `NEXT_PUBLIC_OMIT_CUSTOMER_ORDER_MERGE_FLAG=true` (for APIs that reject unknown keys).

**Whitelist** on the DTO:

- `mergeIntoOpenSession?: boolean`

**Semantics:**

- `true` (or field omitted but your default is merge): resolve `(restaurantId, tableCode)` → find **open** bill/order for that table → **append** `lines`; return same `orderId` when applicable and `merged: true`.
- `false`: only if you need a legacy “always new order” client — create a new order even when an open session exists.

**If orders still replace instead of merge**, the handler is almost certainly **always inserting a new Order/Bill** instead of loading the open bill for that table. Fixing that is **required backend work**; the web app cannot merge two bills by itself.

---

## 3) Response

Extend the success body with:

- `merged?: boolean` — `true` when lines were **appended** to an existing open order/bill; `false` or omitted when a **new** session/order was created.

Keep existing fields (`orderId`, `idempotentReplay`, etc.).

---

## 4) Realtime (staff / kitchen UI)

After a merge or new order, emit an event the staff app already listens for, e.g. **`order:updated`** (and/or `order.updated`) with enough context for `restaurantId` / table / `orderId` so kitchen and orders views refetch or patch. The web app invalidates queries on `order:updated` — see `lib/realtime.ts`.

---

## 5) Edge cases

| Situation | Suggested behavior |
|-----------|-------------------|
| Open order exists, no bill yet | Merge into order; bill follows your normal flow when staff opens billing. |
| Bill `OPEN` with linked order | Merge lines into that order/bill consistently (single source of truth). |
| Only **Completed** orders on table, table still “occupied” | Define whether merge targets **next** open bill only or always creates **new** order; document so staff UX is predictable. |
| Table in `Billing` while guest adds items | Merge into the **current** open bill for that table if product allows; otherwise return valid error — document. |
| Full payment / table cleared | Next `POST` must start a **new** session (`merged` false on first submit after pay). |

---

## 6) Verification

- Two distinct `POST /api/customer/order` calls with the same `tableCode` **before** pay → one open bill/kitchen picture with **combined** lines (or one merged order).
- After full payment per billing lifecycle doc → next guest `POST` creates a **new** session (`merged: false`).
- Kitchen/orders UI updates without manual refresh (`order:updated` or equivalent).
