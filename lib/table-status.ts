import type { Table, TableStatus } from "@/types/table";

/** Map API variants (e.g. `billing`, `BILLING`) to app `TableStatus`. */
export function normalizeTableStatus(raw: unknown): TableStatus {
  if (typeof raw !== "string") return "Available";
  const s = raw.trim();
  if (s === "Available" || s === "Occupied" || s === "Billing") return s;
  const lower = s.toLowerCase();
  if (lower === "available") return "Available";
  if (lower === "occupied") return "Occupied";
  if (lower === "billing") return "Billing";
  return "Available";
}

/**
 * When the API marks a table `Billing` as soon as an order exists, the floor still looks
 * “in service” until kitchen tickets clear. Show **Occupied** in that case; keep **Billing**
 * once there are no active (non-completed) orders for that table so Collect payment matches
 * the payment phase.
 */
export function tableStatusForStaffUi(
  table: Pick<Table, "id" | "number" | "status">,
  activeOrderTableNumbers: Set<number>,
  activeOrderTableIds: Set<string>,
): TableStatus {
  const base = normalizeTableStatus(table.status);
  if (base !== "Billing") return base;
  const byNumber = activeOrderTableNumbers.has(table.number);
  const byId = Boolean(table.id?.trim()) && activeOrderTableIds.has(table.id.trim());
  if (byNumber || byId) return "Occupied";
  return "Billing";
}
