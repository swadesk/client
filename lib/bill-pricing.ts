import type { BillItem } from "@/types/bill";

/** Sum of bill line `totalCents` from the API (may be pre-tax; bill total often includes tax). */
export function sumBillLineTotalsCents(items: BillItem[]): number {
  return items.reduce((s, it) => s + it.totalCents, 0);
}
