import type { Order } from "@/types/order";

/**
 * When the API omits tax fields, match legacy invoice preview behavior.
 */
export const ORDER_LEGACY_FALLBACK_TAX_RATE_PERCENT = 5;

export type OrderMoneyTotals = {
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  gstAmountCents: number;
  totalCents: number;
};

/**
 * Order money totals for display (Orders, dashboard, analytics, invoice preview).
 * Prefer `subtotalCents` / `totalCents` from the API when set so staff UI matches
 * billing/invoices; fall back to summing lines and estimating GST.
 */
export function computeOrderMoneyTotals(order: Order): OrderMoneyTotals {
  const subtotalCents =
    order.subtotalCents ??
    order.items.reduce((s, it) => s + it.priceCents * it.qty, 0);
  const discountCents = order.discountCents ?? 0;
  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const taxRate = order.taxRatePercent ?? ORDER_LEGACY_FALLBACK_TAX_RATE_PERCENT;
  const gstAmountCents =
    order.gstAmountCents ?? Math.round((taxableCents * taxRate) / 100);
  const totalCents = order.totalCents ?? taxableCents + gstAmountCents;
  return { subtotalCents, discountCents, taxableCents, gstAmountCents, totalCents };
}
