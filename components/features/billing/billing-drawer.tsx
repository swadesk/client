"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Table } from "@/types/table";
import type { PaymentMode } from "@/types/payment";
import { formatMoneyFromCents } from "@/lib/format";
import { api, type ApiError } from "@/lib/api";
import { invalidateStaffTableQueries, qk, refetchStaffTableQueries } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BILLING_PAYMENT_MODES } from "@/components/features/billing/billing-payment-modes";
import { Badge } from "@/components/ui/badge";
import { isPrepaidEntity, isVerifiedPrepaid } from "@/lib/prepaid";
import { sumBillLineTotalsCents } from "@/lib/bill-pricing";
import { Separator } from "@/components/ui/separator";

export function BillingDrawer({
  open,
  onOpenChange,
  table,
  restaurantId,
  onPaymentComplete,
  onInvoiceOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table | null;
  restaurantId: string;
  onPaymentComplete?: () => void;
  onInvoiceOpen?: (invoiceId: string) => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = React.useState("");
  const [mode, setMode] = React.useState<PaymentMode>("Cash");

  const billingQuery = useQuery({
    queryKey: qk.billingByTable(restaurantId, table?.id ?? ""),
    queryFn: () => api.billing.byTable(restaurantId, table!.id),
    enabled: open && !!table?.id,
  });

  const bill = billingQuery.data?.bill ?? null;
  const prepaid = isPrepaidEntity(bill);
  const prepaidVerified = isVerifiedPrepaid(bill);
  const existingInvoiceId =
    billingQuery.data?.invoice?.id ?? bill?.invoiceId ?? null;
  const payments = billingQuery.data?.payments ?? [];
  const totalCents = bill?.totalCents ?? 0;
  const paidCents = bill?.paidCents ?? 0;
  const remainingCents = bill?.dueCents ?? 0;
  const progressPercent = totalCents > 0 ? Math.min(100, (paidCents / totalCents) * 100) : 0;
  const billLinesSubtotalCents =
    bill && (bill.items?.length ?? 0) > 0 ? sumBillLineTotalsCents(bill.items) : 0;
  const billTaxOrAdjustCents =
    bill && (bill.items?.length ?? 0) > 0 ? totalCents - billLinesSubtotalCents : 0;
  const showBillLineVsTotal =
    !!bill && (bill.items?.length ?? 0) > 0 && Math.abs(billTaxOrAdjustCents) > 2;

  const createBillMutation = useMutation({
    mutationFn: () => api.billing.create({ restaurantId, tableId: table!.id }),
    onSuccess: () => {
      toast.success("Bill created");
      void qc.invalidateQueries({ queryKey: qk.billingByTable(restaurantId, table!.id) });
      invalidateStaffTableQueries(qc, restaurantId);
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to create bill");
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () => {
      if (!table?.id) throw new Error("Select a table first.");
      return api.billing.createTableInvoice({ restaurantId, tableId: table.id });
    },
    onSuccess: async (res) => {
      toast.success(`Invoice ready (${res.invoice.invoiceNumber})`);
      if (table?.id) {
        await qc.invalidateQueries({ queryKey: qk.billingByTable(restaurantId, table.id) });
      }
      await qc.invalidateQueries({ queryKey: qk.billingList(restaurantId) });
      invalidateStaffTableQueries(qc, restaurantId);
      onInvoiceOpen?.(res.invoice.id);
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to create invoice");
    },
  });

  const payMutation = useMutation({
    mutationFn: (amountCents: number) => {
      if (!bill) throw new Error("Create bill first");
      return api.billing.pay({
        restaurantId,
        billId: bill.id,
        amountCents,
        mode,
      });
    },
    onSuccess: async () => {
      toast.success("Payment recorded");
      if (!table?.id) return;
      await qc.invalidateQueries({ queryKey: qk.billingByTable(restaurantId, table.id) });
      await qc.invalidateQueries({ queryKey: qk.kitchenOrders(restaurantId) });
      await qc.invalidateQueries({ queryKey: qk.floorOrders(restaurantId) });
      await qc.invalidateQueries({ queryKey: qk.billingList(restaurantId) });
      await qc.invalidateQueries({ queryKey: qk.billingByRestaurant(restaurantId) });
      refetchStaffTableQueries(qc, restaurantId);
      const fresh = await api.billing.byTable(restaurantId, table.id);
      const b = fresh.bill;
      const due = b?.dueCents ?? 0;
      const total = b?.totalCents ?? 0;
      const paid = b?.paidCents ?? 0;
      const settled =
        !b ||
        b.status === "PAID" ||
        due <= 0 ||
        (total > 0 && paid >= total);
      if (settled) {
        refetchStaffTableQueries(qc, restaurantId);
        onPaymentComplete?.();
        onOpenChange(false);
      }
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.status === 403) {
        toast.error(
          apiErr.message ||
            "Current plan limit hit for payments. Upgrade from admin settings to continue.",
        );
        return;
      }
      toast.error(apiErr.message || "Failed to record payment");
    },
  });

  const handleAddPayment = () => {
    const cents = Math.round(parseFloat(amount || "0") * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    payMutation.mutate(cents);
    setAmount("");
  };

  const handlePayFull = () => {
    setAmount(String(remainingCents / 100));
  };

  const handlePayRemaining = () => {
    if (remainingCents <= 0) return;
    payMutation.mutate(remainingCents);
  };

  React.useEffect(() => {
    if (!open) {
      setAmount("");
      setMode("Cash");
    }
  }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "gap-0 overflow-hidden p-0 sm:max-w-md",
          "max-h-[min(90vh,640px)] flex flex-col",
        )}
      >
        <DialogHeader className="space-y-3 border-b border-border/60 bg-muted/20 px-6 py-5 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Collect payment
            </DialogTitle>
            {bill ? (
              <Badge
                variant={bill.status === "PAID" ? "secondary" : "outline"}
                className={cn(
                  "font-normal",
                  bill.status === "PAID" &&
                    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                )}
              >
                {bill.status}
              </Badge>
            ) : null}
            {prepaid ? (
              <Badge
                variant="secondary"
                className={cn(
                  prepaidVerified
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                )}
              >
                {prepaidVerified ? "Prepaid" : "Prepaid pending"}
              </Badge>
            ) : null}
          </div>
          <DialogDescription className="text-sm font-medium text-foreground">
            Table {table?.number ?? "—"}
            {bill ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {formatMoneyFromCents(totalCents)} bill
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {!bill ? (
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  No bill is linked to this table yet. Create one to load order lines and record
                  payments.
                </p>
                <Button
                  className="mt-4 w-full"
                  onClick={() => createBillMutation.mutate()}
                  disabled={createBillMutation.isPending || !table}
                >
                  {createBillMutation.isPending ? "Creating bill…" : "Create bill"}
                </Button>
              </div>
            ) : null}

            {bill ? (
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Balance due
                </p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-semibold tabular-nums tracking-tight",
                    remainingCents > 0 ? "text-foreground" : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {formatMoneyFromCents(remainingCents)}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-between gap-4 text-xs text-muted-foreground">
                  <span>
                    Paid <span className="tabular-nums">{formatMoneyFromCents(paidCents)}</span>
                  </span>
                  <span>
                    Total <span className="tabular-nums">{formatMoneyFromCents(totalCents)}</span>
                  </span>
                </div>
              </div>
            ) : null}

            {bill ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bill items
                </h3>
                <div className="max-h-40 space-y-0 overflow-y-auto rounded-xl border border-border/50 bg-muted/15">
                  {(bill.items ?? []).length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No bill items yet.</p>
                  ) : (
                    (bill.items ?? []).map((it, idx) => (
                      <div key={it.id}>
                        {idx > 0 ? <Separator className="bg-border/50" /> : null}
                        <div className="flex justify-between gap-3 px-4 py-3 text-sm">
                          <span className="min-w-0 leading-snug">
                            <span className="tabular-nums text-muted-foreground">{it.qty}×</span>{" "}
                            {it.name}
                          </span>
                          <span className="shrink-0 tabular-nums font-medium">
                            {formatMoneyFromCents(it.totalCents)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {showBillLineVsTotal ? (
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Items subtotal</span>
                      <span className="tabular-nums">{formatMoneyFromCents(billLinesSubtotalCents)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax &amp; other</span>
                      <span className="tabular-nums">{formatMoneyFromCents(billTaxOrAdjustCents)}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {bill ? (
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Record payment
                </h3>
                <p className="mt-1 text-xs text-muted-foreground" id="payment-mode-label">
                  Choose how the guest paid, enter the amount, then add it to the bill.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BILLING_PAYMENT_MODES.map((pm) => (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => setMode(pm.value)}
                      disabled={payMutation.isPending}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all touch-manipulation",
                        "hover:border-primary/40 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-50",
                        mode === pm.value
                          ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
                          : "border-border/60 bg-muted/10",
                      )}
                    >
                      <pm.icon
                        className={cn(
                          "size-5",
                          mode === pm.value ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[11px] font-medium leading-tight",
                          mode === pm.value && "text-primary",
                        )}
                      >
                        {pm.label}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="payment-amount" className="text-sm">
                    Amount
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        id="payment-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        inputMode="decimal"
                        className="pl-8"
                        disabled={payMutation.isPending}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={handlePayFull}
                      disabled={remainingCents <= 0 || payMutation.isPending}
                    >
                      Full balance
                    </Button>
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={handleAddPayment}
                  disabled={!amount || parseFloat(amount || "0") <= 0 || payMutation.isPending}
                >
                  {payMutation.isPending ? "Saving…" : "Add payment"}
                </Button>
              </div>
            ) : null}

            {bill ? (
              <Button
                className={cn(
                  "w-full py-6 text-base font-semibold shadow-md transition-all",
                  remainingCents > 0
                    ? "bg-primary"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
                )}
                size="lg"
                onClick={handlePayRemaining}
                disabled={remainingCents <= 0 || payMutation.isPending}
              >
                {remainingCents > 0
                  ? `Collect remaining ${formatMoneyFromCents(remainingCents)}`
                  : "Fully paid"}
              </Button>
            ) : null}

            {bill ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoice
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => createInvoiceMutation.mutate()}
                    disabled={createInvoiceMutation.isPending}
                  >
                    <FileText className="mr-2 size-4" />
                    {createInvoiceMutation.isPending ? "Working…" : "Create / refresh"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!existingInvoiceId || !onInvoiceOpen}
                    onClick={() => {
                      if (existingInvoiceId && onInvoiceOpen) onInvoiceOpen(existingInvoiceId);
                    }}
                  >
                    View
                  </Button>
                </div>
              </div>
            ) : null}

            {payments.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Payments on this bill
                </h3>
                <ul className="space-y-2">
                  {payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/10 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{p.mode}</span>
                      <span className="tabular-nums font-semibold">
                        {formatMoneyFromCents(p.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {billingQuery.isError ? (
              <p className="text-sm text-destructive">
                {(billingQuery.error as ApiError)?.message ?? "Failed to load billing state."}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
