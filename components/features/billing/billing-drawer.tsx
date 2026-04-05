"use client";

import * as React from "react";
import { SplitSquareVertical, FileText, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Table } from "@/types/table";
import type { PaymentMode } from "@/types/payment";
import type { BillSplitMode, BillSplitPartInput } from "@/types/bill";
import { formatMoneyFromCents } from "@/lib/format";
import { api, type ApiError } from "@/lib/api";
import { invalidateStaffTableQueries, qk, refetchStaffTableQueries } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BILLING_PAYMENT_MODES } from "@/components/features/billing/billing-payment-modes";
import { Badge } from "@/components/ui/badge";
import { isPrepaidEntity, isVerifiedPrepaid } from "@/lib/prepaid";
import { sumBillLineTotalsCents } from "@/lib/bill-pricing";

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
  const [splitMode, setSplitMode] = React.useState<BillSplitMode>("evenly");
  const [customSplitParts, setCustomSplitParts] = React.useState<Array<{ id: string; amount: string }>>([
    { id: crypto.randomUUID(), amount: "" },
  ]);

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

  const splitMutation = useMutation({
    mutationFn: () => {
      if (!bill) throw new Error("Create bill first");
      let parts: BillSplitPartInput[] | undefined = undefined;
      if (splitMode === "custom") {
        const parsed = customSplitParts
          .map((part) => ({
            amountCents: Math.round(Number(part.amount || "0") * 100),
          }))
          .filter((part) => Number.isFinite(part.amountCents) && part.amountCents > 0);
        if (parsed.length === 0) {
          throw new Error("Add at least one custom split amount.");
        }
        parts = parsed;
      }
      return api.billing.split({
        restaurantId,
        billId: bill.id,
        mode: splitMode,
        parts,
      });
    },
    onSuccess: () => {
      toast.success(`Bill split updated (${splitMode})`);
      if (table?.id) {
        void qc.invalidateQueries({ queryKey: qk.billingByTable(restaurantId, table.id) });
      }
      invalidateStaffTableQueries(qc, restaurantId);
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.message) {
        toast.error(apiErr.message);
        return;
      }
      if (apiErr.status === 403) {
        toast.error(
          apiErr.message ||
            "Current plan limit hit for split configuration. Upgrade from Settings to continue.",
        );
        return;
      }
      toast.error(apiErr.message || "Failed to split bill");
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
      setSplitMode("evenly");
      setCustomSplitParts([{ id: crypto.randomUUID(), amount: "" }]);
    }
  }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex flex-wrap items-center gap-2">
            Collect payment — Table {table?.number ?? "—"}
            {bill ? (
              <Badge
                variant={bill.status === "PAID" ? "secondary" : "outline"}
                className={
                  bill.status === "PAID"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : "font-normal"
                }
              >
                Bill {bill.status}
              </Badge>
            ) : null}
            {prepaid ? (
              <Badge
                variant="secondary"
                className={
                  prepaidVerified
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }
              >
                {prepaidVerified ? "Prepaid" : "Prepaid pending"}
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 space-y-6 overflow-y-auto pb-[max(2rem,env(safe-area-inset-bottom))]">
          {!bill ? (
            <section className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Start billing
              </h3>
              <p className="text-sm text-muted-foreground">
                No bill is linked to this table yet. Create one to load order lines and record
                payments. If the kitchen is still preparing, you can open this again when the
                table is ready to pay.
              </p>
              <Button
                onClick={() => createBillMutation.mutate()}
                disabled={createBillMutation.isPending || !table}
                className="w-full"
              >
                {createBillMutation.isPending ? "Creating bill..." : "Create bill"}
              </Button>
            </section>
          ) : null}

          {/* Bill summary */}
          {bill ? (
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bill summary
              </h3>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                {(bill.items ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bill items yet.</p>
                ) : (
                  bill.items.map((it) => (
                    <div key={it.id}>
                      <div className="flex justify-between text-sm">
                        <span>
                          {it.qty}x {it.name}
                        </span>
                        <span className="tabular-nums">{formatMoneyFromCents(it.totalCents)}</span>
                      </div>
                    </div>
                  ))
                )}
                {showBillLineVsTotal ? (
                  <div className="space-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
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
            </section>
          ) : null}

          {/* Split bill */}
          {bill ? (
            <section className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Split options
              </h3>
              <Select value={splitMode} onValueChange={(v) => setSplitMode(v as BillSplitMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evenly">Split evenly</SelectItem>
                  <SelectItem value="by_item">Split by item</SelectItem>
                  <SelectItem value="custom">Custom split</SelectItem>
                </SelectContent>
              </Select>
              {splitMode === "custom" ? (
                <div className="space-y-2">
                  <Label>Custom split amounts (INR)</Label>
                  <div className="space-y-2">
                    {customSplitParts.map((part, idx) => (
                      <div key={part.id} className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={part.amount}
                          onChange={(e) =>
                            setCustomSplitParts((prev) =>
                              prev.map((p) =>
                                p.id === part.id ? { ...p, amount: e.target.value } : p,
                              ),
                            )
                          }
                          placeholder={`Part ${idx + 1} amount`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setCustomSplitParts((prev) =>
                              prev.length <= 1 ? prev : prev.filter((p) => p.id !== part.id),
                            )
                          }
                          disabled={customSplitParts.length <= 1}
                          aria-label={`Remove part ${idx + 1}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setCustomSplitParts((prev) => [
                          ...prev,
                          { id: crypto.randomUUID(), amount: "" },
                        ])
                      }
                    >
                      <Plus className="mr-2 size-4" />
                      Add split part
                    </Button>
                  </div>
                </div>
              ) : null}
              <Button
                variant="secondary"
                className="w-full"
                disabled={splitMutation.isPending}
                onClick={() => splitMutation.mutate()}
              >
                <SplitSquareVertical className="mr-2 size-4" />
                {splitMutation.isPending ? "Updating split..." : "Apply split"}
              </Button>
            </section>
          ) : null}

          {/* Invoice */}
          {bill ? (
            <section className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Invoice
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => createInvoiceMutation.mutate()}
                  disabled={createInvoiceMutation.isPending}
                >
                  <FileText className="mr-2 size-4" />
                  {createInvoiceMutation.isPending ? "Creating..." : "Create / refresh invoice"}
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
                  <FileText className="mr-2 size-4" />
                  View invoice
                </Button>
              </div>
            </section>
          ) : null}

          {/* Totals and progress */}
          {bill ? (
            <section className="space-y-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total due</span>
                <span className="tabular-nums">{formatMoneyFromCents(totalCents)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Paid</span>
                <span className="tabular-nums">{formatMoneyFromCents(paidCents)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Remaining</span>
                <span
                  className={cn(
                    "tabular-nums",
                    remainingCents > 0 && "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {formatMoneyFromCents(remainingCents)}
                </span>
              </div>
            </section>
          ) : null}

          {/* Payments recorded */}
          {payments.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payments recorded
              </h3>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm"
                  >
                    <span className="font-medium">{p.mode}</span>
                    <span className="tabular-nums font-semibold">{formatMoneyFromCents(p.amountCents)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Add payment */}
          {bill ? (
            <section className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Add payment
              </h3>
              <div className="space-y-3">
                <Label htmlFor="payment-amount" className="text-sm font-medium">
                  Amount (₹)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="payment-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="flex-1"
                    disabled={payMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePayFull}
                    disabled={remainingCents <= 0 || payMutation.isPending}
                  >
                    Pay full
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <Label id="payment-mode-label" className="text-sm font-medium">
                  Payment mode
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BILLING_PAYMENT_MODES.map((pm) => (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => setMode(pm.value)}
                      disabled={payMutation.isPending}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 transition-all touch-manipulation",
                        "hover:border-primary/50 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-50",
                        mode === pm.value
                          ? "border-primary bg-primary/10"
                          : "border-border/60 bg-muted/20",
                      )}
                    >
                      <pm.icon
                        className={cn(
                          "size-5",
                          mode === pm.value ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span
                        className={cn("text-xs font-medium", mode === pm.value && "text-primary")}
                      >
                        {pm.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleAddPayment}
                disabled={!amount || parseFloat(amount || "0") <= 0 || payMutation.isPending}
              >
                {payMutation.isPending ? "Saving payment..." : "Add payment"}
              </Button>
            </section>
          ) : null}

          {/* Complete CTA */}
          {bill ? (
            <Button
              className={cn(
                "w-full py-6 text-base font-semibold transition-all",
                remainingCents > 0
                  ? "opacity-80"
                  : "bg-emerald-600 text-white shadow-lg hover:bg-emerald-700",
              )}
              size="lg"
              onClick={handlePayRemaining}
              disabled={remainingCents <= 0 || payMutation.isPending}
            >
              {remainingCents > 0
                ? `Collect remaining ${formatMoneyFromCents(remainingCents)}`
                : "Payment complete"}
            </Button>
          ) : null}
          {billingQuery.isError ? (
            <p className="text-sm text-destructive">
              {(billingQuery.error as ApiError)?.message ?? "Failed to load billing state."}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
