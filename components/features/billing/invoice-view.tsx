"use client";

import { format } from "date-fns";
import type { Order } from "@/types/order";
import type { Invoice } from "@/types/invoice";
import type { Restaurant } from "@/types/restaurant";
import { formatMoneyFromCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { isPrepaidEntity, isVerifiedPrepaid } from "@/lib/prepaid";
import { computeOrderMoneyTotals, ORDER_LEGACY_FALLBACK_TAX_RATE_PERCENT } from "@/lib/order-pricing";

type InvoiceViewProps = {
  restaurant: Restaurant;
  /** Canonical tax + totals from `GET /api/invoices/:id` — preferred over `order`. */
  invoice?: Invoice | null;
  /** Legacy / completed-order dialog — uses fallback tax if totals missing. */
  order?: Order | null;
  invoiceNumber?: string;
};

export function InvoiceView({ order, invoice, restaurant, invoiceNumber }: InvoiceViewProps) {
  const useInvoice = Boolean(invoice);

  const channel =
    (useInvoice ? invoice!.channel : order?.orderChannel ?? order?.channel) ?? "DINE_IN";
  const createdAt = useInvoice ? invoice!.createdAt : order!.createdAt;
  const notes = useInvoice ? invoice!.notes ?? undefined : order?.notes;
  const couponCode = useInvoice ? invoice!.couponCode : order?.couponCode;
  const customerName = useInvoice ? invoice!.customerName ?? undefined : order?.customerName;
  const customerPhone = useInvoice ? invoice!.customerPhone ?? undefined : order?.customerPhone;
  const customerEmail = useInvoice ? invoice!.customerEmail ?? undefined : undefined;
  const prepaid = isPrepaidEntity(useInvoice ? invoice! : order);
  const prepaidVerified = isVerifiedPrepaid(useInvoice ? invoice! : order);

  let subtotalCents: number;
  let discountCents: number;
  let gstAmountCents: number | null | undefined;
  let cgstCents: number | null | undefined;
  let sgstCents: number | null | undefined;
  let taxRatePercent: number | null | undefined;
  let totalCents: number;
  let invNum: string;
  let lineItems: { id: string; name: string; qty: number; rateCents: number; amountCents: number }[];
  let tableNumber: number;
  let orderIdLabel: string;

  if (useInvoice && invoice) {
    subtotalCents = invoice.subtotalCents;
    discountCents = invoice.discountCents ?? 0;
    gstAmountCents = invoice.gstAmountCents;
    cgstCents = invoice.cgstCents;
    sgstCents = invoice.sgstCents;
    taxRatePercent = invoice.taxRatePercent ?? undefined;
    totalCents = invoice.totalCents;
    invNum = invoice.invoiceNumber ?? invoiceNumber ?? `INV-${invoice.id.slice(-8).toUpperCase()}`;
    lineItems = invoice.items.map((it) => {
      const amountCents = it.totalCents ?? it.priceCents * it.qty;
      const rateCents = it.qty > 0 ? Math.round(amountCents / it.qty) : it.priceCents;
      return { id: it.id, name: it.name, qty: it.qty, rateCents, amountCents };
    });
    tableNumber = invoice.tableNumber ?? 0;
    orderIdLabel = invoice.orderId ?? invoice.id;
  } else if (order) {
    const m = computeOrderMoneyTotals(order);
    subtotalCents = m.subtotalCents;
    discountCents = m.discountCents;
    taxRatePercent = order.taxRatePercent ?? ORDER_LEGACY_FALLBACK_TAX_RATE_PERCENT;
    gstAmountCents = m.gstAmountCents;
    cgstCents = order.cgstCents ?? Math.floor(m.gstAmountCents / 2);
    sgstCents = order.sgstCents ?? m.gstAmountCents - Math.floor(m.gstAmountCents / 2);
    totalCents = m.totalCents;
    invNum =
      order.invoiceNumber ?? invoiceNumber ?? `INV-${order.id.slice(-8).toUpperCase()}`;
    lineItems = order.items.map((it) => ({
      id: it.id,
      name: it.name,
      qty: it.qty,
      rateCents: it.priceCents,
      amountCents: it.priceCents * it.qty,
    }));
    tableNumber = order.tableNumber;
    orderIdLabel = order.id;
  } else {
    return null;
  }

  const showTaxLines =
    (gstAmountCents != null && gstAmountCents > 0) ||
    (cgstCents != null && cgstCents > 0) ||
    (sgstCents != null && sgstCents > 0);
  const halfRate =
    taxRatePercent != null && taxRatePercent > 0
      ? taxRatePercent / 2
      : ORDER_LEGACY_FALLBACK_TAX_RATE_PERCENT / 2;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-print-root invoice-print bg-white text-black">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 size-4" />
          Print
        </Button>
      </div>

      <div className="mx-auto max-w-xl space-y-8 px-6 py-8">
        <header className="border-b border-black/10 pb-6">
          <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
          {restaurant.address && (
            <p className="mt-1 text-sm text-black/70">{restaurant.address}</p>
          )}
          {restaurant.gstin && (
            <p className="mt-1 text-sm font-medium">GSTIN: {restaurant.gstin}</p>
          )}
        </header>

        <div className="flex justify-between text-sm">
          <div>
            <div className="font-semibold text-black/70">Invoice</div>
            <div className="mt-1 font-mono font-semibold">{invNum}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-black/70">Channel</div>
            <div className="mt-1 flex items-center justify-end gap-2 font-semibold">
              <span>{channel === "TAKEAWAY" ? "Takeaway" : "Dine-in"}</span>
              {prepaid ? (
                <span
                  className={
                    prepaidVerified
                      ? "rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-700"
                      : "rounded border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-700"
                  }
                >
                  {prepaidVerified ? "Prepaid" : "Prepaid pending"}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <div>
            <div className="font-semibold text-black/70">
              {channel === "TAKEAWAY" ? "Customer" : "Table"}
            </div>
            <div className="mt-1 font-semibold">
              {channel === "TAKEAWAY"
                ? customerName || "Walk-in"
                : tableNumber > 0
                  ? `Table ${tableNumber}`
                  : "-"}
            </div>
          </div>
          {channel === "TAKEAWAY" && customerPhone ? (
            <div className="text-right">
              <div className="font-semibold text-black/70">Phone</div>
              <div className="mt-1 font-semibold">{customerPhone}</div>
            </div>
          ) : null}
          {channel !== "TAKEAWAY" ? (
            <div className="text-right">
              <div className="font-semibold text-black/70">Order</div>
              <div className="mt-1 font-semibold">#{orderIdLabel.slice(-8).toUpperCase()}</div>
            </div>
          ) : null}
        </div>

        {customerEmail ? (
          <div className="text-sm">
            <span className="font-semibold text-black/70">Email </span>
            <span className="font-semibold">{customerEmail}</span>
          </div>
        ) : null}

        {notes ? (
          <div className="text-sm text-black/70">
            Notes: {notes}
          </div>
        ) : null}

        <div className="text-sm text-black/70">
          Date: {format(new Date(createdAt), "dd MMM yyyy, HH:mm")}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/20 text-left font-semibold">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((it) => (
              <tr key={it.id} className="border-b border-black/5">
                <td className="py-2">{it.name}</td>
                <td className="py-2 text-right tabular-nums">{it.qty}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatMoneyFromCents(it.rateCents)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatMoneyFromCents(it.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-2 border-t border-black/10 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-black/70">Subtotal</span>
            <span className="tabular-nums font-medium">
              {formatMoneyFromCents(subtotalCents)}
            </span>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount{couponCode ? ` (${couponCode})` : ""}</span>
              <span className="tabular-nums">-{formatMoneyFromCents(discountCents)}</span>
            </div>
          )}
          {showTaxLines ? (
            <>
              <div className="flex justify-between text-black/70">
                <span>CGST @ {halfRate}%</span>
                <span className="tabular-nums">
                  {formatMoneyFromCents(cgstCents ?? Math.floor((gstAmountCents ?? 0) / 2))}
                </span>
              </div>
              <div className="flex justify-between text-black/70">
                <span>SGST @ {halfRate}%</span>
                <span className="tabular-nums">
                  {formatMoneyFromCents(
                    sgstCents ?? (gstAmountCents ?? 0) - Math.floor((gstAmountCents ?? 0) / 2),
                  )}
                </span>
              </div>
            </>
          ) : null}
          <div className="flex justify-between border-t border-black/20 pt-3 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoneyFromCents(totalCents)}</span>
          </div>
        </div>

        <footer className="border-t border-black/10 pt-6 text-center text-xs text-black/60">
          Thank you for dining with us
        </footer>
      </div>
    </div>
  );
}
