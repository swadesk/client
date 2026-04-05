import { api, type ApiError } from "@/lib/api";
import type { Order } from "@/types/order";
import { isOrderCompletedStatus } from "@/lib/order-status";

export type FetchFloorOrdersOptions = {
  /**
   * When false, only kitchen is used (typically `GET /api/kitchen/orders`, with fallback to
   * `.../pending`). Waiters are usually **403** on `GET /api/admin/orders`. When true, kitchen +
   * admin lists are merged for managers/admins.
   */
  mergeWithAdmin?: boolean;
};

/**
 * Some backends wrap lists as `{ orders: [...] }`, `{ data: [...] }`, or nest under `payload`.
 */
export function normalizeOrdersResponse(raw: unknown): Order[] {
  if (Array.isArray(raw)) return raw as Order[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["orders", "data", "results", "items"] as const) {
      const v = o[key];
      if (Array.isArray(v)) return v as Order[];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const inner = v as Record<string, unknown>;
        for (const ik of ["orders", "data", "items", "results"] as const) {
          const a = inner[ik];
          if (Array.isArray(a)) return a as Order[];
        }
      }
    }
    const payload = o.payload;
    if (payload && typeof payload === "object") {
      const p = payload as Record<string, unknown>;
      if (Array.isArray(p.orders)) return p.orders as Order[];
      if (Array.isArray(p.data)) return p.data as Order[];
    }
  }
  return [];
}

function sortByCreatedAt(orders: Order[]): Order[] {
  return [...orders].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
  );
}

/**
 * Prefer `GET /api/kitchen/orders` (all active statuses). Falls back to `.../pending` when the
 * full route is not deployed (404/405).
 */
export async function fetchKitchenOrdersList(restaurantId: string): Promise<Order[]> {
  try {
    const raw = await api.kitchen.orders(restaurantId);
    return normalizeOrdersResponse(raw);
  } catch (e) {
    const status = (e as ApiError)?.status;
    // 404/405: route not deployed. 403: some APIs allow only `/pending` for Waiter — try it.
    if (status === 404 || status === 405 || status === 403) {
      const raw = await api.kitchen.pendingOrders(restaurantId);
      return normalizeOrdersResponse(raw);
    }
    throw e;
  }
}

function mergeActiveOrders(kitchen: Order[], admin: Order[]): Order[] {
  const byId = new Map<string, Order>();
  for (const o of kitchen) {
    if (o?.id && !isOrderCompletedStatus(o.status)) byId.set(o.id, o);
  }
  for (const o of admin) {
    if (o?.id && !isOrderCompletedStatus(o.status) && !byId.has(o.id)) {
      byId.set(o.id, o);
    }
  }
  return sortByCreatedAt(Array.from(byId.values()));
}

/**
 * Floor queue for staff. Waiters **must not** call admin orders (typically 403); use
 * `mergeWithAdmin: false` for `role === "Waiter"`.
 */
export async function fetchActiveFloorOrders(
  restaurantId: string,
  options?: FetchFloorOrdersOptions,
): Promise<Order[]> {
  const mergeWithAdmin = options?.mergeWithAdmin !== false;

  if (!mergeWithAdmin) {
    const list = (await fetchKitchenOrdersList(restaurantId)).filter(
      (o) => o?.id && !isOrderCompletedStatus(o.status),
    );
    return sortByCreatedAt(list);
  }

  const [kitchenSettled, adminSettled] = await Promise.allSettled([
    fetchKitchenOrdersList(restaurantId),
    api.admin.orders(restaurantId),
  ]);

  const kitchen =
    kitchenSettled.status === "fulfilled" ? kitchenSettled.value : [];
  const admin =
    adminSettled.status === "fulfilled" ? normalizeOrdersResponse(adminSettled.value) : [];

  return mergeActiveOrders(kitchen, admin);
}
