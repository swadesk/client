"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatMoneyFromCents } from "@/lib/format";
import { api, type ApiError } from "@/lib/api";
import { qk, refetchStaffTableQueries } from "@/lib/query-keys";
import type { PaymentMode } from "@/types/payment";
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

export type RecordPaymentBillSummary = {
  id: string;
  totalCents: number;
  paidCents: number;
  dueCents: number;
  /** When set, table-scoped queries are invalidated after pay. */
  tableId?: string | null;
};

type RecordPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  bill: RecordPaymentBillSummary | null;
  /** Invalidate invoice detail after payment (e.g. current dialog invoice). */
  invoiceId?: string | null;
  title?: string;
  onPaidInFull?: () => void;
};

export function RecordPaymentDialog({
  open,
  onOpenChange,
  restaurantId,
  bill,
  invoiceId,
  title = "Record payment",
  onPaidInFull,
}: RecordPaymentDialogProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = React.useState("");
  const [mode, setMode] = React.useState<PaymentMode>("Cash");

  const remainingCents = bill?.dueCents ?? 0;
  const totalCents = bill?.totalCents ?? 0;
  const paidCents = bill?.paidCents ?? 0;
  const progressPercent = totalCents > 0 ? Math.min(100, (paidCents / totalCents) * 100) : 0;

  React.useEffect(() => {
    if (!open) {
      setAmount("");
      setMode("Cash");
    }
  }, [open]);

  const payMutation = useMutation({
    mutationFn: (amountCents: number) => {
      if (!bill) throw new Error("No bill");
      return api.billing.pay({
        restaurantId,
        billId: bill.id,
        amountCents,
        mode,
      });
    },
    onSuccess: async (_data, amountCents) => {
      toast.success("Payment recorded");
      void qc.invalidateQueries({ queryKey: qk.billingList(restaurantId) });
      void qc.invalidateQueries({ queryKey: qk.billingByRestaurant(restaurantId) });
      if (bill?.tableId?.trim()) {
        void qc.invalidateQueries({
          queryKey: qk.billingByTable(restaurantId, bill.tableId),
        });
      }
      void qc.invalidateQueries({ queryKey: qk.kitchenOrders(restaurantId) });
      void qc.invalidateQueries({ queryKey: qk.floorOrders(restaurantId) });
      if (invoiceId) {
        void qc.invalidateQueries({
          queryKey: qk.invoiceDetail(restaurantId, invoiceId),
        });
      }
      setAmount("");
      refetchStaffTableQueries(qc, restaurantId);
      const nextDue = remainingCents - amountCents;
      if (nextDue <= 0) {
        onPaidInFull?.();
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
  };

  const handlePayFull = () => {
    setAmount(String(remainingCents / 100));
  };

  const handlePayRemaining = () => {
    if (remainingCents <= 0) return;
    payMutation.mutate(remainingCents);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Payments apply to this bill. Totals refresh after each successful payment.
          </DialogDescription>
        </DialogHeader>

        {bill ? (
          <div className="space-y-5">
            <section className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
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

            <section className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
              <Label htmlFor="record-pay-amount" className="text-sm font-medium">
                Amount (₹)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="record-pay-amount"
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
            </section>

            <section className="space-y-3">
              <Label className="text-sm font-medium">Payment mode</Label>
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
            </section>

            <Button
              variant="secondary"
              className="w-full"
              onClick={handleAddPayment}
              disabled={
                !amount || parseFloat(amount || "0") <= 0 || payMutation.isPending || remainingCents <= 0
              }
            >
              {payMutation.isPending ? "Saving…" : "Add payment"}
            </Button>

            <Button
              className="w-full py-6 text-base font-semibold"
              size="lg"
              onClick={handlePayRemaining}
              disabled={remainingCents <= 0 || payMutation.isPending}
            >
              {remainingCents > 0
                ? `Pay remaining ${formatMoneyFromCents(remainingCents)}`
                : "Paid in full"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No bill selected.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
