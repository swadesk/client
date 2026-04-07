import type { QueryClient } from "@tanstack/react-query";

export const qk = {
  adminMenu: (restaurantId: string) => ["admin.menu", restaurantId] as const,
  adminTables: (restaurantId: string) => ["admin.tables", restaurantId] as const,
  waiterTables: (restaurantId: string) => ["waiter.tables", restaurantId] as const,
  waiterMe: (restaurantId: string, userId: string) =>
    ["waiter.me", restaurantId, userId] as const,
  adminWaiters: (restaurantId: string) => ["admin.waiters", restaurantId] as const,
  adminInventory: (restaurantId: string) => ["admin.inventory", restaurantId] as const,
  kitchenOrders: (restaurantId: string) => ["kitchen.orders", restaurantId] as const,
  /** Waiter/manager floor queue (kitchen API with admin fallback) — prefix-invalidate all variants. */
  floorOrders: (restaurantId: string) => ["floor.orders", restaurantId] as const,
  billingByTable: (restaurantId: string, tableId: string) =>
    ["billing.table", restaurantId, tableId] as const,
  billingByRestaurant: (restaurantId: string) => ["billing", restaurantId] as const,
  billingList: (
    restaurantId: string,
    query?: { status?: string; channel?: string; from?: string; to?: string },
  ) =>
    [
      "billing.list",
      restaurantId,
      query?.status ?? "all",
      query?.channel ?? "all",
      query?.from ?? "none",
      query?.to ?? "none",
    ] as const,
  invoiceDetail: (restaurantId: string, invoiceId: string) =>
    ["invoice.detail", restaurantId, invoiceId] as const,
  qrMenu: (restaurantId: string) => ["qr.menu", restaurantId] as const,
};

/** Admin + waiter table grids use different keys; invalidate both after floor/billing changes. */
export function invalidateStaffTableQueries(qc: QueryClient, restaurantId: string) {
  void qc.invalidateQueries({ queryKey: qk.adminTables(restaurantId) });
  void qc.invalidateQueries({ queryKey: qk.waiterTables(restaurantId) });
}

export function refetchStaffTableQueries(qc: QueryClient, restaurantId: string) {
  void qc.refetchQueries({ queryKey: qk.adminTables(restaurantId) });
  void qc.refetchQueries({ queryKey: qk.waiterTables(restaurantId) });
}
