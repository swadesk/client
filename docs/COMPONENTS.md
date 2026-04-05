# Component organization

## `components/ui/`

Shadcn/Radix primitives (buttons, cards, dialogs, etc.). Do not add business logic here.

## `components/shared/`

App-wide reusable pieces that are not domain-specific:

- `page-header.tsx` — `PageHeader`, `SectionHeader`
- `empty-state.tsx` — `EmptyState`, `ErrorState`
- `query-state.tsx` — `QueryState` (loading/error/empty/success for TanStack Query), skeleton helpers

## `components/layout/`

Application shell only:

- `app-shell.tsx`, `sidebar.tsx`, `top-header.tsx`, `auth-guard.tsx`, `nav-items.ts`

## `components/features/`

Domain UI grouped by area (import from `@/components/features/...`):

| Folder       | Contents |
| ------------ | -------- |
| `dashboard/` | `StatCard` |
| `tables/`    | `TableCard`, `TableQrDialog` (printable table QR) |
| `menu/`      | `CategorySidebar`, `MenuItemCard`, `MenuItemDialog` |
| `orders/`    | `OrderCard` |
| `kitchen/`   | `KitchenBoard` (KDS columns) |
| `qr/`        | `QrMenuItemRow`, `CartDrawer` |
| `charts/`    | Recharts wrappers |

Barrel export: `@/components/features` (see `components/features/index.ts`).

## Other

- `lib/` — API client, query keys, utilities (`errors.ts`, `format.ts`, …)
- `store/` — Zustand stores
- `types/` — TypeScript models and API contracts
