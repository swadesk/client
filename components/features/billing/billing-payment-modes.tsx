"use client";

import type { LucideIcon } from "lucide-react";
import { Banknote, CreditCard, MoreHorizontal, Smartphone } from "lucide-react";
import type { PaymentMode } from "@/types/payment";
import { PAYMENT_POLICY } from "@/lib/payment-policy";

export const BILLING_PAYMENT_MODES: {
  value: PaymentMode;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "Cash", label: "Cash", icon: Banknote },
  { value: "Card", label: "Card", icon: CreditCard },
  ...(PAYMENT_POLICY.allowStaffUpi
    ? [{ value: "UPI" as const, label: "UPI", icon: Smartphone }]
    : []),
  { value: "Other", label: "Other", icon: MoreHorizontal },
];
