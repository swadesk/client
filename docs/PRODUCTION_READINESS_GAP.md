# Production Readiness Gap Report

This report maps the requested production-readiness prompt to the current frontend implementation in qRyte and identifies what is already present, what is missing, and what backend support is currently visible from frontend contracts.

---

## 1) Requirement Matrix (Done vs Pending)

| Area | Current status | Already implemented | Still needed |
| --- | --- | --- | --- |
| Role-based access control | Partial | Auth/session gating and super-admin split in layout/guards | Central RBAC policy (`canAccess`, `canPerform`), route-level staff-role guards, component action guards |
| Staff-specific UI simplification | Missing | None for Waiter/Kitchen route restrictions | Waiter-only and Kitchen-only navigation/route surface |
| Quick order (`/quick-order`) | Missing | Reusable order/cart primitives exist (Zustand cart + place-order mutation) | New route + table picker + menu builder + notes + optimistic UX |
| Table lifecycle automation | Partial | Table statuses and manual status update exist | Auto transitions (`Occupied`, `Billing`, `Available`) based on order/payment lifecycle |
| Realtime improvements | Partial | Socket hook and invalidation on `order:created` / `order:updated` exist | Notification sound, payload merge for instant status updates |
| Error handling and UX | Partial | Common API error shape + query error state wrappers exist | Global 401/403 handling, status-aware message mapping, network retry UX |
| Offline-first resilience | Minimal | Query retry baseline (`retry: 1`) | Failed order queue, online re-sync, syncing states |
| Performance and cleanup | Partial | Dynamic imports for analytics charts, shared skeleton loaders | Query tuning by domain, more lazy loading, render optimization |
| Polish | Partial | Many pages already have loading/empty/error states | Consistent loading/empty behavior across all actions and tablet-focused QA |

---

## 2) Backend Support Audit (from frontend contracts)

### Confirmed support

- Quick order compatible endpoint exists: `POST /api/customer/order`.
- Table lifecycle API surface exists: tables list/create/assign/status/delete.
- Billing/payment endpoints exist: order bills/split/payments/complete-payment.
- Realtime socket contract is expected at `/kitchen` namespace with `order:created` and `order:updated`.
- Auth payload includes role information needed for UI RBAC (`globalRole`, `role`, `canAccessDashboard`).

### Partial or not verifiable from frontend only

- Enforcement quality of backend RBAC per role (ADMIN vs MANAGER vs WAITER vs KITCHEN) cannot be verified from this repository alone.
- Socket payload richness (whether it supports direct cache merge on update) cannot be verified without backend event schema/runtime inspection.

### Known backend gap signaled by UI

- Super-admin users endpoint may be missing on some environments (`GET /api/super-admin/users`), with explicit fallback messaging in the super-admin page.

---

## 3) Prioritized Implementation Sequence

1. Build central RBAC policy layer (`lib/rbac.ts`) with route/action maps and helpers.
2. Integrate RBAC into guards and sidebar filtering for strict role-scoped navigation.
3. Add `/quick-order` route using existing cart/order primitives and optimistic mutation behavior.
4. Add table lifecycle automation wiring from order/billing/payment events.
5. Upgrade realtime hook to include notification sound and payload-driven cache updates.
6. Introduce global API error handling behavior (401 signout/login redirect, 403 no-access state).
7. Implement offline mutation queue for order submissions with online re-sync.
8. Perform final polish pass: consistent loading/empty states, tablet UX refinements, and query/render performance tuning.

---

## Evidence Pointers

- RBAC/guards/navigation: `lib/auth-routing.ts`, `components/layout/auth-guard.tsx`, `components/layout/main-app-gate.tsx`, `components/layout/sidebar.tsx`, `components/layout/nav-items.ts`
- Realtime: `lib/realtime.ts`, `lib/socket.ts`
- API contracts: `lib/api.ts`, `types/api.ts`, `types/auth.ts`
- Tables/billing flow: `app/(app)/tables/page.tsx`, `components/features/tables/table-card.tsx`, `components/features/billing/billing-drawer.tsx`
- Existing place-order flow: `components/features/qr/cart-drawer.tsx`, `store/cart-store.ts`
