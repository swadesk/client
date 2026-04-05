"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Bill } from "@/types/bill";
import { normalizeCustomerName, normalizeCustomerPhone } from "@/lib/customer-contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

type BillCustomerContactFormProps = {
  bill: Bill;
  restaurantId: string;
  invoiceId?: string | null;
};

export function BillCustomerContactForm({
  bill,
  restaurantId,
  invoiceId,
}: BillCustomerContactFormProps) {
  const qc = useQueryClient();
  const [name, setName] = React.useState(bill.customerName ?? "");
  const [phone, setPhone] = React.useState(bill.customerPhone ?? "");
  const [email, setEmail] = React.useState(bill.customerEmail ?? "");

  React.useEffect(() => {
    setName(bill.customerName ?? "");
    setPhone(bill.customerPhone ?? "");
    setEmail(bill.customerEmail ?? "");
  }, [bill.id, bill.customerName, bill.customerPhone, bill.customerEmail]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const n = normalizeCustomerName(name);
      const p = normalizeCustomerPhone(phone);
      const e = email.trim();
      if (e && !isValidEmail(e)) {
        throw new Error("Enter a valid email address.");
      }
      return api.billing.updateBillCustomer({
        restaurantId,
        billId: bill.id,
        customerName: n || undefined,
        customerPhone: p || undefined,
        customerEmail: e || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Customer details saved");
      void qc.invalidateQueries({ queryKey: qk.billingList(restaurantId) });
      void qc.invalidateQueries({ queryKey: qk.billingByRestaurant(restaurantId) });
      if (bill.tableId?.trim()) {
        void qc.invalidateQueries({
          queryKey: qk.billingByTable(restaurantId, bill.tableId),
        });
      }
      if (invoiceId) {
        void qc.invalidateQueries({ queryKey: qk.invoiceDetail(restaurantId, invoiceId) });
      }
    },
    onError: (err: unknown) => {
      const e = err as ApiError | Error;
      const msg =
        "message" in e && typeof e.message === "string"
          ? e.message
          : "Failed to save customer details";
      if ("status" in e && e.status === 404) {
        toast.error(
          "Saving contacts requires the billing customer API on the server. See docs/BACKEND_BILLING_CUSTOMER_NOTIFICATIONS.md.",
        );
        return;
      }
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-3 rounded-xl border border-black/[0.04] bg-muted/20 p-3 dark:border-white/[0.06]">
      <div className="text-[13px] font-medium text-foreground">Customer details</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`cust-name-${bill.id}`}>Name</Label>
          <Input
            id={`cust-name-${bill.id}`}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder="Guest name"
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`cust-phone-${bill.id}`}>Phone</Label>
          <Input
            id={`cust-phone-${bill.id}`}
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            placeholder="10-digit mobile"
            inputMode="numeric"
            autoComplete="tel"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`cust-email-${bill.id}`}>Email</Label>
        <Input
          id={`cust-email-${bill.id}`}
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="Optional"
          autoComplete="email"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full sm:w-auto"
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Saving…" : "Save customer details"}
      </Button>
    </div>
  );
}
