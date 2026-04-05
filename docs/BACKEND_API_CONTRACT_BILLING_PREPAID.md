# Backend API Contract: Billing, Invoice, Prepaid QR, Quick Bill

This document defines the backend API requirements for the latest frontend changes in qRyte:

- End-to-end billing and invoice flows
- QR prepaid before order placement
- Table and non-table (takeaway) invoice creation
- Quick bill and pay (floating action flow)

It is written as a contract BE can implement against.

---

## 1) Goals

1. QR orders can be prepaid before order creation.
2. Bill is available immediately after order placement.
3. Manual invoice creation works from table and takeaway flows.
4. Billing list and invoice details support dedicated Billing page.
5. Customer name/phone and payment summary are consistent across dine-in and takeaway.

---

## 2) Core entity expectations

### Order

Required/expected fields used by frontend:

- `id`
- `status`
- `createdAt`
- `channel`: `"DINE_IN" | "TAKEAWAY"`
- `tableId?`, `tableNumber?`
- `customerName?`, `customerPhone?`
- `couponCode?`, `discountCents?`, `subtotalCents?`, `totalCents?`
- `billId?`, `invoiceId?`, `invoiceNumber?`
- `prepaid?` (shape in prepaid section)

### Bill

- `id`, `restaurantId`, `tableId`
- `status`: `"OPEN" | "PARTIAL" | "PAID"`
- `totalCents`, `paidCents`, `dueCents`
- `items[]` (`id`, `name`, `qty`, `priceCents`, `totalCents`)
- `sourceType?`: `"ORDER" | "TABLE" | "TAKEAWAY"`
- `orderId?`, `invoiceId?`, `invoiceNumber?`
- `channel?`: `"DINE_IN" | "TAKEAWAY"`
- `customerName?`, `customerPhone?`
- `prepaid?`

### Invoice

- `id`, `invoiceNumber`, `restaurantId`, `createdAt`
- `billId?`, `orderId?`
- `channel?`: `"DINE_IN" | "TAKEAWAY"`
- `status?`: `"DRAFT" | "ISSUED" | "PAID" | "VOID"`
- `tableId?`, `tableNumber?`
- `customerName?`, `customerPhone?`, `notes?`
- `subtotalCents`, `discountCents?`, `couponCode?`
- `gstAmountCents?`, `cgstCents?`, `sgstCents?`, `taxRatePercent?`
- `totalCents`
- `prepaid?`
- `items[]` (`id`, `name`, `qty`, `priceCents`, `totalCents?`)

### Prepaid object (shared)

```json
{
  "method": "UPI_BANK | ONLINE",
  "status": "PENDING | VERIFIED | FAILED",
  "amountCents": 0,
  "referenceId": "string",
  "transactionId": "string",
  "provider": "string",
  "discountCents": 0,
  "finalPayableCents": 0,
  "verifiedAt": "ISO_DATETIME"
}
```

---

## 3) Endpoint contracts

## 3.1 Customer prepaid init

`POST /api/customer/prepaid/init`

### Request

```json
{
  "restaurantId": "string",
  "tableCode": "string",
  "customerName": "string",
  "customerPhone": "string",
  "method": "UPI_BANK | ONLINE",
  "couponCode": "string",
  "lines": [{ "itemId": "string", "qty": 1 }]
}
```

Notes:

- `tableCode` optional for takeaway/non-table.
- BE must calculate amount and discount; FE must not be source of truth.

### Response

```json
{
  "amountCents": 25000,
  "discountCents": 1000,
  "finalPayableCents": 24000,
  "referenceId": "PP_12345",
  "status": "PENDING",
  "instructions": "Pay to UPI ID ...",
  "bankAccount": {
    "accountName": "string",
    "accountNumberMasked": "XXXX1234",
    "ifsc": "string",
    "upiId": "string"
  },
  "gateway": {
    "provider": "string",
    "orderId": "string",
    "paymentUrl": "string",
    "clientSecret": "string"
  }
}
```

Rules:

- For `UPI_BANK`, `instructions/bankAccount` should be returned.
- For `ONLINE`, `gateway` should be returned.
- If online-discount applies, include `discountCents`.

---

## 3.2 Customer prepaid verify

`POST /api/customer/prepaid/verify`

### Request

```json
{
  "restaurantId": "string",
  "referenceId": "string",
  "method": "UPI_BANK | ONLINE",
  "transactionId": "string"
}
```

### Response

```json
{
  "prepaid": {
    "method": "UPI_BANK",
    "status": "VERIFIED",
    "amountCents": 24000,
    "referenceId": "PP_12345",
    "transactionId": "UTR123",
    "discountCents": 1000,
    "finalPayableCents": 24000,
    "verifiedAt": "2026-03-23T10:00:00.000Z"
  }
}
```

Rules:

- Must be idempotent for repeated verify calls on same `referenceId`.
- On failure, return error with `status` and clear reason.

---

## 3.3 Place customer order (extended)

`POST /api/customer/order`

### Request additions

Existing payload remains valid; add support for:

```json
{
  "channel": "DINE_IN | TAKEAWAY",
  "customerName": "string",
  "customerPhone": "string",
  "prepaid": {
    "method": "UPI_BANK | ONLINE",
    "status": "VERIFIED",
    "amountCents": 24000,
    "referenceId": "PP_12345",
    "transactionId": "UTR123"
  }
}
```

### Response additions

```json
{
  "ok": true,
  "orderId": "string",
  "billId": "string",
  "invoiceId": "string",
  "invoiceNumber": "string",
  "prepaid": { "...": "..." },
  "idempotentReplay": false
}
```

Rules:

- Keep strong idempotency by `idempotencyKey` and `restaurantId`.
- If prepaid is provided, order should persist prepaid summary.

---

## 3.4 Create bill from order

`POST /api/billing/from-order`

### Request

```json
{
  "restaurantId": "string",
  "orderId": "string"
}
```

### Response

```json
{
  "bill": { "...": "Bill object" },
  "invoice": { "...": "Invoice object or null" }
}
```

Rules:

- Must be idempotent.
- If order has verified prepaid, set `bill.paidCents` and `status` accordingly.
- Link `sourceType: ORDER`, `orderId`, and `channel`.

---

## 3.5 Billing create/split/pay/by-table (existing + required behavior)

- `POST /api/billing/create`
- `POST /api/billing/split`
- `POST /api/billing/pay`
- `GET /api/billing/:tableId?restaurantId=...`

`GET /api/billing/:tableId` response shape:

```json
{
  "bill": { "...": "Bill or null" },
  "payments": [{ "...": "Payment rows" }],
  "invoice": { "...": "Invoice or null" }
}
```

Rules:

- `pay` must correctly roll up `paidCents/dueCents/status`.
- If fully paid, status should become `PAID`.

---

## 3.6 Table invoice creation and lookup

- `POST /api/billing/table/:tableId/invoice` with body `{ "restaurantId": "..." }`
- `GET /api/billing/table/:tableId/invoice/latest?restaurantId=...`

Response:

- Create: `{ "bill": Bill, "invoice": Invoice }`
- Latest: `{ "invoice": Invoice | null }`

---

## 3.7 Takeaway invoice creation

`POST /api/billing/takeaway`

### Request

```json
{
  "restaurantId": "string",
  "customerName": "string",
  "customerPhone": "string",
  "notes": "string",
  "couponCode": "string",
  "discountCents": 0,
  "taxRatePercent": 5,
  "lines": [{ "name": "Item", "qty": 1, "priceCents": 10000 }]
}
```

### Response

```json
{
  "bill": { "...": "Bill object" },
  "invoice": { "...": "Invoice object" }
}
```

Rules:

- Must use `channel: TAKEAWAY`.
- Must persist customer details into bill/invoice for consistency.

---

## 3.8 Billing list (for Billing page)

`GET /api/billing?restaurantId=...&status=OPEN|PARTIAL|PAID&channel=DINE_IN|TAKEAWAY&from=YYYY-MM-DD&to=YYYY-MM-DD`

### Response

```json
[
  {
    "bill": { "...": "Bill object" },
    "invoice": { "...": "Invoice object or null" }
  }
]
```

---

## 3.9 Invoice detail

`GET /api/invoices/:invoiceId?restaurantId=...`

### Response

Single `Invoice` object (full shape from section 2).

---

## 4) Realtime events expected by frontend

Emit through existing kitchen/socket channel:

- `order:created`, `order:updated` (already used)
- `payment.completed` (already used)
- `bill.created`, `bill.updated`
- `invoice.created`, `invoice.updated`
- `prepaid.verified` (new)
- `payment.prepaid_verified` (new alias used by FE)

These events are used to invalidate Billing/Orders/Kitchen queries.

---

## 5) Validation and business rules

- Customer name: non-empty, minimum 2 chars (recommended).
- Customer phone: normalized to 10 digits for India (FE does this; BE should enforce too).
- Money in paise (`*Cents` fields).
- Discount should be backend-authoritative.
- Reject unverified prepaid payloads for prepaid-required flow.

---

## 6) Error shape

Use current FE-compatible error format:

```json
{
  "success": false,
  "message": "Human-readable message",
  "errorCode": "OPTIONAL_MACHINE_CODE"
}
```

Status codes:

- `400` validation
- `401` auth
- `403` permission/plan limit
- `404` not found
- `409` idempotency/data conflict when relevant
- `500` internal

---

## 7) Prompt-ready summary for BE

Implement prepaid-aware customer ordering and billing endpoints for a multi-tenant restaurant app. Add `prepaid/init`, `prepaid/verify`, extend `customer/order` with `channel/customer/prepaid`, keep idempotency on order creation and `billing/from-order`, persist customer details consistently in bill/invoice/order, expose billing list + invoice detail + table/takeaway invoice creation, and emit realtime events (`bill.*`, `invoice.*`, `prepaid.verified`) for UI cache invalidation.
