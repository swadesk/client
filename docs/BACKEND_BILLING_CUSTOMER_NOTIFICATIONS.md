# Backend: Bill customer contact & notifications (email / WhatsApp)

The frontend stores **customer name, phone, email** and **notification toggles** (email invoice, WhatsApp) on a **bill** so staff can trigger or schedule guest-facing messages after payment / invoice issuance.

Until this API exists, **Save customer details** on the Billing page returns **404** and the UI shows a short message pointing here.

---

## 1) Endpoint

`**PATCH /api/billing/bill/:billId/customer?restaurantId=...`**

- Auth: same as other billing routes (staff JWT + venue access).
- Idempotent updates: missing fields leave existing values unchanged (define explicitly in your implementation).

### Request body (JSON)


| Field            | Type     | Notes                                                         |
| ---------------- | -------- | ------------------------------------------------------------- |
| `customerName`   | string?  | Trimmed display name                                          |
| `customerPhone`  | string?  | Normalized (e.g. 10-digit India); required for WhatsApp sends |
| `customerEmail`  | string?  | Required if `notifyEmail` is true                             |
| `notifyEmail`    | boolean? | Staff opt-in: send/email invoice copy                         |
| `notifyWhatsapp` | boolean? | Staff opt-in: enqueue WhatsApp (template message, etc.)       |


### Response

- `**200**`: Updated `**Bill**` object including persisted `customerName`, `customerPhone`, `customerEmail`, `notifyEmail`, `notifyWhatsapp`.
- `**404**`: Unknown `billId` or restaurant mismatch.
- `**400**`: Validation (invalid email, phone when WhatsApp enabled, etc.).

---

## 2) Persistence

- Store fields on **Bill** (and mirror to linked **Invoice** / **Order** if your model requires consistency for `GET /api/invoices/:id`).
- `**GET /api/billing`** list rows should return bills with these fields populated so the UI can pre-fill the form.

---

## 3) Notifications (implementation options)

The API **persists preferences**; actual delivery can be asynchronous:

1. **Email**: On save or on `bill.status === PAID` / invoice issued, enqueue job to send PDF/link to `customerEmail` when `notifyEmail === true`.
2. **WhatsApp**: Use BSP (e.g. Meta Cloud API) with approved templates; enqueue when `notifyWhatsapp === true` and `customerPhone` is valid. Respect opt-in / DND regulations.

Emit realtime events if useful for the admin UI (e.g. `notification.queued`, `notification.failed`).

---

## 4) Related: table display

For `**GET /api/billing`** list items, include either:

- `bill.tableNumber` (integer), and/or  
- ensure `tableId` resolves to a table the FE can join,

so **“Table N”** labels are correct without extra round-trips. The frontend also loads `GET /api/admin/tables` as a fallback to map `tableId` → `number`.

---

## 5) Related: table lifecycle after payment

See **[BACKEND_BILLING_TABLE_LIFECYCLE.md](./BACKEND_BILLING_TABLE_LIFECYCLE.md)** — table status, idempotent invoices, and avoiding duplicate billing rows.

---

## 6) Validation checklist

- `PATCH` updates bill and returns full bill shape used by the list.
- List + invoice detail endpoints expose `customerEmail`, `notifyEmail`, `notifyWhatsapp` when set.
- WhatsApp/email workers read stored flags and contact fields; failures are logged and optionally surfaced to admins.

