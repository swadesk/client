# Backend: Kitchen order rounds (merged table session)

When a guest at a table places a **second** order before checkout, the bill usually stays on one **`orderId`** and new lines are **merged** (see [BACKEND_CUSTOMER_ORDER_MERGE.md](./BACKEND_CUSTOMER_ORDER_MERGE.md)). Kitchen staff still need to see **distinct “fires”** (1st submit vs 2nd submit), not one undifferentiated list.

The web app groups lines into **rounds** in the KDS and KOT when the API provides enough signal. This document describes what to expose on **order lines** in responses such as `GET /api/kitchen/orders` and admin order payloads.

---

## 1) Preferred: per-line timestamp

On each **order line**, set when that line was added to the order/bill:

- **`addedAt`** — ISO-8601 string (recommended), or  
- **`added_at`**, **`lineCreatedAt`**, **`line_created_at`**, **`firedAt`**, **`fired_at`** (aliases the client maps)

**Merge behavior:**

- Lines from the **first** guest submit keep their original `addedAt`.
- Lines **appended** on a later submit MUST get a **new** `addedAt` (that submit’s server time).

The client clusters lines into rounds when the time gap between consecutive line times (after sorting) exceeds **90 seconds**, unless **`kitchenBatchId`** is present (section 2).

---

## 2) Stronger: explicit batch / fire id

If each guest submit has a stable id (submission id, “fire” id, KOT batch id), put the **same value on every line** from that submit:

- **`kitchenBatchId`**, or **`kitchen_batch_id`**, **`fireBatchId`**, **`fire_batch_id`**, **`submissionId`**

All lines sharing one id form **one** kitchen round. Rounds are ordered by the **earliest** line time in each batch.

When any line includes `kitchenBatchId`, the client **groups by batch id** and does not use the 90-second time gap rule.

---

## 3) Quantity merges (same `itemId`)

If merging **increments `qty`** on an **existing** line instead of appending a new row, the kitchen **cannot** show “part of this qty from round 1, part from round 2” unless you:

- append **separate line rows** per submit (each with its own `addedAt` / `kitchenBatchId`), or  
- store and return **line-level** history / sub-lines, or  
- attach batch metadata the client can display even for a single aggregated row.

Prefer **append a new line** per submit when items repeat, or always set **`kitchenBatchId`** on updates if the domain model allows it.

---

## 4) Realtime

After a merge, emit **`order:updated`** / **`order.updated`** (and/or equivalent) so kitchen and floor views refetch. The web app already invalidates queries on these events (see `lib/realtime.ts`).

---

## 5) Verification

- Two `POST /api/customer/order` calls for the same table before pay → one `orderId`, combined bill.  
- Kitchen API returns lines such that either:
  - new lines have **later `addedAt`** than the first wave, or  
  - new lines share a **new `kitchenBatchId`**.  
- KDS shows **“1st order • HH:mm”** and **“2nd order • HH:mm”** (or equivalent batch grouping).  
- If **no** per-line `addedAt` and **no** `kitchenBatchId`, all lines fall back to **`order.createdAt`** and appear as **one** round (expected limitation).

---

## 6) Kitchen columns vs one `order.status` (Ready / Pending mismatch)

Today many stacks (including this app’s KDS) put the **whole order** in **Pending / Preparing / Ready** using a **single** field on the order, e.g. `status` on `PATCH /api/waiter/order`.

That works for **one shot** of items. It breaks when:

1. Staff marks the order **Ready** after the first guest submit.  
2. A **second** submit **merges** new lines into the **same** `orderId`.  
3. The order’s `status` is still **Ready**, so the ticket (and every line) appears under **Ready** even though the new items were never prepared.

**Root cause:** billing/session identity (`orderId`) is **one**, but **kitchen work** is **multiple units of work** (one per submit / per batch). One shared status cannot represent both “first wave picked up” and “second wave not started.”

### Recommended model (pick one)

**A — Per-batch (or per-ticket) kitchen status (best fit)**  

- Introduce a stable **`kitchenBatchId`** (or `KitchenTicket` id) per guest submit.  
- Store **kitchen state per batch**: `Pending` | `Preparing` | `Ready` (and optionally `Served` / `Completed` for handoff).  
- `PATCH` updates **batch id + status**, not only `orderId`.  
- KDS shows **one card per batch** (or one order card with columns driven by **worst** or **leading** batch — product choice).  
- Billing still uses one `orderId`; kitchen uses many batch rows.

**B — Line-level kitchen status**  

- Each line has `kitchenStatus` (or `prepStatus`). KDS groups or filters by line. More precise, more UI/API surface.

**C — Merge bumps kitchen queue back to Pending**  

- When new lines merge into an order that was `Ready` / `Preparing`, set a **kitchen-facing** status back to **`Pending`** (or add `kitchenQueueStatus` separate from waiter/customer-facing status).  
- Risk: staff may think the **entire** order regressed; mitigate with UI copy (“New items — previous round still ready”) and/or keep **batch** model.

**D — Derive column in the API (“effective kitchen status”)**  

- Return something like `kitchenDisplayStatus` or `activeBatchStatus`: e.g. if **any** open batch is not Ready, the ticket sorts as **Pending** / **Preparing** for queue purposes, even if an older batch was Ready.  
- Still need **per-batch** completion timestamps or statuses to do this correctly.

### Frontend note (qRyte)

The KDS builds **one card per `kitchenBatch`** when the API returns **`kitchenBatches[]`** (or when the client derives multiple batches from line **`kitchenBatchId`** / **`kitchenLineStatus`**). Drag-and-drop calls **`POST /api/waiter/order`** with optional **`kitchenBatchId`**. Legacy orders (no batches) still use top-level **`status`** only.

---

## 7) HTTP API contract (qRyte frontend)

### 7.1 Update kitchen status

**Route:** `POST /api/waiter/order`  
**Content-Type:** `application/json`

**Body (legacy — one ticket per order):**

```json
{
  "restaurantId": "uuid",
  "orderId": "uuid",
  "status": "Pending | Preparing | Ready"
}
```

**Body (per-batch — required when the order has multiple kitchen batches):**

```json
{
  "restaurantId": "uuid",
  "orderId": "uuid",
  "kitchenBatchId": "uuid-or-string-stable-per-submit",
  "status": "Pending | Preparing | Ready"
}
```

**Rules:**

- **`kitchenBatchId`** MUST identify the **same** batch as in `GET /api/kitchen/orders` (`kitchenBatches[].id` or line `kitchenBatchId`).
- If the backend only supports whole-order status, omit **`kitchenBatchId`** and return a **single** implicit batch; the client will not send **`kitchenBatchId`**.
- **`status`** MUST NOT be `Completed` in this payload (same as today); use your existing “complete order” flow if applicable.
- **Kitchen flow (enforce server-side too):** valid transitions are **Pending → Preparing → Ready** only. Reject **skipping** (e.g. Pending → Ready), **backward** moves (e.g. Ready → Preparing), and no-ops. The web UI enforces the same in `lib/kitchen-status-flow.ts`.

**Response:** `{ "ok": true }` (or your existing `WaiterUpdateOrderResponse`).

---

### 7.2 List kitchen queue (shape the client parses)

**Route:** `GET /api/kitchen/orders?restaurantId=…` (and fallback `…/pending` if used)

The client unwraps `orders` / `data` / `payload` arrays (existing behavior). Each **order** element SHOULD include:

| Field | Required | Description |
|--------|----------|-------------|
| `id` | yes | Order / bill id |
| `tableNumber` | yes | Display number |
| `status` | yes | Overall order status (used when there are **no** batches) |
| `createdAt` | yes | ISO-8601 |
| `items` | yes | Line items (see §1–§3) |
| **`kitchenBatches`** | recommended | Array of batches (below). If omitted, client may **derive** batches from distinct line `kitchenBatchId` + `kitchenLineStatus` / heuristics. |

**`kitchenBatches[]` element:**

```json
{
  "id": "batch-uuid-or-fire-id",
  "status": "Pending | Preparing | Ready",
  "label": "Optional — shown on KDS card",
  "createdAt": "optional ISO-8601",
  "items": [ ]
}
```

- If **`items`** is omitted or empty, the client assigns lines where **`item.kitchenBatchId === batch.id`**.
- Each batch **`status`** drives which **Pending / Preparing / Ready** column that **card** appears in.

**Per-line fields the client maps (optional but useful):**

- `kitchenBatchId` — ties line to a batch.
- `kitchenLineStatus` / `kitchenStatus` / `prepStatus` — per-line prep column; used to infer batch status when batches are derived client-side.
- `addedAt` — for KOT round labels / time clustering (see §1).

---

### 7.3 Example: merged second submit

```json
{
  "id": "order-100",
  "tableNumber": 4,
  "status": "Ready",
  "createdAt": "2026-04-08T10:00:00.000Z",
  "items": [
    { "id": "l1", "name": "Dosa", "qty": 2, "priceCents": 12000, "kitchenBatchId": "b1", "addedAt": "2026-04-08T10:00:00.000Z" },
    { "id": "l2", "name": "Coffee", "qty": 1, "priceCents": 8000, "kitchenBatchId": "b2", "addedAt": "2026-04-08T10:25:00.000Z" }
  ],
  "kitchenBatches": [
    { "id": "b1", "status": "Ready", "items": [] },
    { "id": "b2", "status": "Pending", "items": [] }
  ]
}
```

The KDS shows **two cards** for table 4: **b1** in Ready, **b2** in Pending, even though top-level **`status`** is `Ready`.
