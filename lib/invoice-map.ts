import type { Invoice } from "@/types/invoice";
import type { Order } from "@/types/order";

/**
 * Reuse existing invoice renderer by mapping canonical invoice payload
 * to the order-shaped model consumed by InvoiceView.
 */
export function invoiceToOrder(invoice: Invoice): Order {
  return {
    id: invoice.orderId ?? invoice.id,
    tableNumber: invoice.tableNumber ?? 0,
    tableId: invoice.tableId ?? undefined,
    status: "Completed",
    createdAt: invoice.createdAt,
    channel: invoice.channel,
    customerName: invoice.customerName ?? undefined,
    customerPhone: invoice.customerPhone ?? undefined,
    notes: invoice.notes ?? undefined,
    couponCode: invoice.couponCode ?? undefined,
    discountCents: invoice.discountCents ?? 0,
    subtotalCents: invoice.subtotalCents,
    totalCents: invoice.totalCents,
    billId: invoice.billId ?? undefined,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    gstAmountCents: invoice.gstAmountCents,
    cgstCents: invoice.cgstCents,
    sgstCents: invoice.sgstCents,
    taxRatePercent: invoice.taxRatePercent,
    prepaid: invoice.prepaid ?? undefined,
    isPrepaid: invoice.isPrepaid ?? undefined,
    prepaidStatus: invoice.prepaidStatus ?? undefined,
    prepaidReferenceId: invoice.prepaidReferenceId ?? undefined,
    items: invoice.items.map((it) => ({
      id: it.id,
      name: it.name,
      qty: it.qty,
      priceCents: it.priceCents,
    })),
  };
}
