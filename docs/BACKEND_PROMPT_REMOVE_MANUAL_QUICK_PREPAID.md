# Backend Prompt: Remove Prepaid and Quick/Manual Billing Additions

Use the following prompt with the backend team/AI to hard-remove prepaid and quick/manual billing paths that are no longer needed.

---

## Prompt to BE

You are updating backend APIs for a restaurant POS platform.

Frontend has reverted to **normal POS billing** and no longer uses prepaid-before-order or quick/manual non-table shortcuts. Please perform a hard cleanup and keep only standard order -> bill -> payment -> invoice flows.

### 1) Remove prepaid APIs completely

- Delete these endpoints and handlers:
  - `POST /api/customer/prepaid/init`
  - `POST /api/customer/prepaid/verify`
- Remove related service methods, validators, DTOs, and tests.
- Remove any webhook/event handlers that exist only for this prepaid flow.

### 2) Remove prepaid fields from customer order contract

- `POST /api/customer/order` should no longer accept or persist:
  - `prepaid` object
  - prepaid status/reference metadata
  - prepaid discount metadata
- Keep support for existing normal fields used by current frontend:
  - `restaurantId`, `tableCode`, `idempotencyKey`, `couponCode`, `notes`, `lines`
- Keep idempotency behavior unchanged.

### 3) Remove prepaid metadata from domain models and API responses

Hard-remove prepaid-related schema/fields from:

- Order model/response
- Bill model/response
- Invoice model/response

If historical DB columns exist, mark them deprecated or migrate out based on your migration strategy.

### 4) Remove prepaid-related realtime events

Stop emitting and handling:

- `prepaid.verified`
- `payment.prepaid_verified`

Keep existing billing/invoice/order events only.

### 5) Remove manual takeaway invoice creation (optional hard removal)

Frontend **no longer calls** `POST /api/billing/takeaway` (manual walk-in takeaway invoice form was removed from the Billing page). Align backend with product if you want a hard cleanup:

- Deprecate or remove `POST /api/billing/takeaway` and related DTOs/services/tests.
- Return `410 Gone` or `404` with a clear message once removed.
- Historical takeaway bills/invoices created in the past should remain readable via `GET /api/billing` and `GET /api/invoices/:invoiceId` if applicable.

### 6) Keep standard billing endpoints active

Do not remove normal POS billing endpoints, including:

- `POST /api/billing/from-order` (if currently used for order -> bill linkage)
- `POST /api/billing/create`
- `POST /api/billing/split`
- `POST /api/billing/pay`
- `GET /api/billing/:tableId`
- `POST /api/billing/table/:tableId/invoice`
- `GET /api/billing/table/:tableId/invoice/latest`
- `GET /api/billing` list
- `GET /api/invoices/:invoiceId`

### 7) Backward compatibility and rollout

- Return clear `410`/`404` for removed prepaid endpoints.
- Ensure no server errors if old clients still send removed prepaid fields (gracefully ignore or reject with clear validation message).
- Update API docs/OpenAPI and changelog.

### 8) Validation checklist

- QR order place works without prepaid.
- Table billing + payment collection works.
- `POST /api/billing/pay` works for bills shown on the Billing page (including historical takeaway rows).
- Invoice generation/view/print flows work.
- No references to prepaid DTOs/routes/events remain in codebase.
- If takeaway endpoint was removed: frontend no longer calls `POST /api/billing/takeaway`; legacy takeaway rows still list/filter where applicable.

---

## Why this change

Product direction is now simple, standard POS billing. Prepaid-before-order and quick/manual shortcut billing introduced extra complexity and should be fully removed backend-side to reduce maintenance risk.

---

## Related: bill customer contact & notifications

See **[BACKEND_BILLING_CUSTOMER_NOTIFICATIONS.md](./BACKEND_BILLING_CUSTOMER_NOTIFICATIONS.md)** for `PATCH /api/billing/bill/:billId/customer` (email / WhatsApp prefs persisted on the bill).
