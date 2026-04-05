import type { Bill } from "@/types/bill";
import type { Table } from "@/types/table";

/**
 * Human-readable table line for billing cards (prefers API `tableNumber`, else admin tables list).
 */
export function tableLabelForBill(bill: Bill, tables: Table[] | undefined): string {
  if (bill.tableNumber != null && bill.tableNumber > 0) {
    return `Table ${bill.tableNumber}`;
  }
  const match = tables?.find((t) => t.id === bill.tableId);
  if (match) return `Table ${match.number}`;
  if (bill.tableId?.trim()) {
    return `Table (${bill.tableId.slice(0, 8)}…)`;
  }
  return "Dine-in";
}
