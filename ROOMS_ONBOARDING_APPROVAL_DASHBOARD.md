# Rooms + Onboarding Room Sections + Approvals + Dashboard (qRyte)

This document captures **everything added/changed** in the qRyte frontend to support:

- **Room sections captured during client onboarding**
- **Superadmin approval review includes room sections**
- **Dashboard shows room sections**
- **New Rooms entity (separate from Tables)**
  - CRUD (create/delete)
  - Assign waiter to room
  - Generate **Room QR**
- **Client portal gating**: Rooms/Tables/Floor/QR only show if onboarding provided room sections.

> Note: This repository is primarily a **frontend**. Most routes under `/api/...` are served by an external backend (NamasQR API). The frontend changes below require backend support (detailed later).

---

## Feature 1 — “Room sections” captured during onboarding

### What it does
- On onboarding “New venue”, the user must enter **Room / dining sections** (free text).
- This value is submitted with the venue bootstrap request and becomes part of the restaurant profile.
- Superadmin sees it while approving.
- After approval, it appears in the venue dashboard.

### Frontend changes
- **Type update**: `BootstrapRestaurantRequest` includes `roomSections?: string`
  - File: `types/auth.ts`
- **API client update**: `api.auth.bootstrapRestaurant` appends multipart field `roomSections`
  - File: `lib/api.ts`
- **UI update**: onboarding form includes required `Room / dining sections`
  - File: `app/(flows)/onboarding/page.tsx`

---

## Feature 2 — Superadmin approval review shows room sections

### What it does
- Superadmin “Permissions” pending-venues list shows a **Room sections** column.
- Superadmin “Super Admin” overview (expanded row) shows room sections block.

### Frontend changes
- `Permissions` pending table adds “Room sections” column (clamped, hover to see full via `title`)
  - File: `app/(app)/permissions/page.tsx`
- `Super Admin` expanded row shows a room sections block above staff list
  - File: `app/(app)/super-admin/page.tsx`

> Approval action remains **approve/reject venue** (existing flow). Room sections are just displayed as part of what’s reviewed.

---

## Feature 3 — Room sections block in Dashboard

### What it does
- Dashboard shows a “Room sections” block loaded from restaurant profile.

### Frontend changes
- Dashboard fetches restaurant profile via `api.restaurants.get(restaurantId)` and renders `roomSections`
  - File: `app/(app)/dashboard/page.tsx`

---

## Feature 4 — Client portal gating (only show if onboarding has room sections)

### Requirement implemented
> “It shall be a check while user onboarding else it shall not show in client portal”

### What it does
If the active restaurant does **not** have `roomSections`:
- Hide **Rooms**, **Tables**, and **Floor map** from sidebar navigation.
- Disable “QR menu preview” link.
- If user directly opens `/rooms`, `/tables`, `/floor-map`, they see an EmptyState (“Room setup required”).

### Frontend changes
- Restaurant switcher store now persists `roomSections`
  - File: `store/restaurant-store.ts`
- App shell now stores `roomSections` into the restaurant store from `/api/restaurants`
  - File: `components/layout/app-shell.tsx`
- Sidebar hides/gates nav items and QR preview link based on `activeRestaurant.roomSections`
  - File: `components/layout/sidebar.tsx`
- Tables page blocks access if `roomSections` missing
  - File: `app/(app)/tables/page.tsx`
- Floor map page blocks access if `roomSections` missing
  - File: `app/(app)/floor-map/page.tsx`

---

## Feature 5 — New “Rooms” entity (separate from Tables)

### What it does
Adds a **Rooms module** like Tables:
- List rooms
- Create room (Admin/Manager)
- Assign waiter to room (Admin/Manager)
- Delete room (Admin/Manager)
- Generate **Room QR** (PNG + copy link)

### Frontend changes
#### New types
- `Room` model
  - File: `types/room.ts`
- API contract additions (frontend expects these shapes)
  - File: `types/api.ts`
    - `AdminRoomsGetResponse`
    - `AdminCreateRoomRequest/Response`
    - `AdminAssignRoomRequest/Response`

#### New API client methods
File: `lib/api.ts` (`api.admin.*`)
- `rooms(restaurantId)` → `GET /api/admin/rooms?restaurantId=...`
- `createRoom(payload)` → `POST /api/admin/rooms`
- `assignRoomToWaiter(payload)` → `PATCH /api/admin/rooms`
- `deleteRoom(restaurantId, roomId)` → `DELETE /api/admin/rooms/:roomId?restaurantId=...`

#### New UI pages/components
- Rooms page
  - File: `app/(app)/rooms/page.tsx`
- Room QR dialog
  - File: `components/features/rooms/room-qr-dialog.tsx`

#### Navigation
- Adds `/rooms` to member nav
  - File: `components/layout/nav-items.ts`
- Adds icon for rooms
  - File: `components/layout/sidebar-icons.tsx` (`RoomsIcon`)
- Wires icon and gating
  - File: `components/layout/sidebar.tsx`

---

## Room QR — how it works in the frontend

### Current Room QR link format
Room QR currently generates a link like:

`/qr-menu/<restaurantId>/room_<roomId>?pickTable=1&roomId=<roomId>`

This reuses the existing guest QR menu route:
- Route: `app/qr-menu/[restaurantId]/[tableId]/page.tsx`
- It already supports `pickTable=1` to enable a table picker (intended for preview/dev).

### What happens when scanned
Today:
- The guest menu opens
- It shows “Room …” label for `room_<roomId>` (label formatting improved)
- It allows the guest to pick a table **if the backend includes tables in the menu payload**.

> Optional enhancement (not implemented yet): filter available tables by `roomId` in the QR menu table picker. That requires backend to return room metadata on tables.

---

## Backend requirements (must be implemented in your API)

### A) Store & return onboarding `roomSections`
Add `roomSections` (nullable text) in your Restaurant/Venue model.

#### Required endpoints/behaviour
- `POST /api/auth/bootstrap-restaurant` (multipart)
  - Read field `roomSections`
  - Validate (e.g. required, max length)
  - Persist
- `GET /api/restaurants`
  - Return `roomSections` for each restaurant
- `GET /api/restaurants/:id`
  - Return `roomSections`
- `GET /api/super-admin/restaurants/pending`
  - Return `roomSections` for pending restaurants so superadmin can review it

### B) Rooms CRUD + waiter assignment
Add a new “Room” entity.

#### Required endpoints
- `GET /api/admin/rooms?restaurantId=<id>`
  - Returns: `Room[]`
  - Shape expected by frontend:
    - `id: string`
    - `name: string`
    - `waiterId?: string | null`
- `POST /api/admin/rooms`
  - Body: `{ restaurantId: string, name: string }`
  - Returns: `Room`
- `PATCH /api/admin/rooms`
  - Body: `{ restaurantId: string, roomId: string, waiterId: string | null }`
  - Returns: `Room`
- `DELETE /api/admin/rooms/:roomId?restaurantId=<id>`
  - Returns: `{ ok: true }`

### C) Waiter IDs used for assignment
Rooms page uses:
- `GET /api/admin/waiters?restaurantId=...` (already exists in this app) to populate the waiter dropdown.

So the backend should ensure:
- Waiter IDs returned there are valid targets for room assignment.

### D) (Optional) Table picker filtered by room in guest QR
If you want Room QR to show only tables in that room:
- Backend should include a `tables` array in the QR menu payload (it already can)
- Each table should carry `roomId` (and optionally `roomName`)
- Then we can filter the picker by `roomId` from the query string.

---

## Notes / constraints

- The frontend currently treats “Rooms” as an operational grouping (like a zone). It does **not** replace Tables.
- The QR ordering flow ultimately uses a **tableCode** for ordering. “Room QR” currently opens the menu and relies on “pick table” behaviour (guest selects a table).

---

## Files changed/added (summary)

### Added
- `types/room.ts`
- `app/(app)/rooms/page.tsx`
- `components/features/rooms/room-qr-dialog.tsx`

### Updated
- `types/auth.ts`
- `types/restaurant.ts`
- `types/api.ts`
- `lib/api.ts`
- `app/(flows)/onboarding/page.tsx`
- `app/(app)/permissions/page.tsx`
- `app/(app)/super-admin/page.tsx`
- `app/(app)/dashboard/page.tsx`
- `store/restaurant-store.ts`
- `components/layout/app-shell.tsx`
- `components/layout/nav-items.ts`
- `components/layout/sidebar-icons.tsx`
- `components/layout/sidebar.tsx`
- `app/(app)/tables/page.tsx`
- `app/(app)/floor-map/page.tsx`
- `app/qr-menu/[restaurantId]/[tableId]/page.tsx`

