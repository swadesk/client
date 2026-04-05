"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Ticket, X, WalletCards } from "lucide-react";
import { api, type ApiError } from "@/lib/api";
import { cartSubtotalCents, useCartStore } from "@/store/cart-store";
import { formatMoneyFromCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Ask the API to merge this cart into the table’s open order/bill when one exists.
 * Set `NEXT_PUBLIC_OMIT_CUSTOMER_ORDER_MERGE_FLAG=true` only if your backend rejects
 * unknown JSON keys (then implement merge without requiring this field — see docs).
 */
const omitCustomerOrderMergeFlag =
  process.env.NEXT_PUBLIC_OMIT_CUSTOMER_ORDER_MERGE_FLAG === "true";

type CartDrawerProps = {
  /** Authoritative venue for checkout (from QR URL). Overrides persisted store for API calls. */
  orderingRestaurantId: string;
  /** Value for `tableCode` on `POST /api/customer/order` (from table picker / QR segment). */
  orderingTableCode: string;
  prepaidConfig?: {
    upiId?: string | null;
    upiName?: string | null;
    upiQrUrl?: string | null;
  };
};

export function CartDrawer({
  orderingRestaurantId,
  orderingTableCode,
  prepaidConfig,
}: CartDrawerProps) {
  const { lines, couponCode, setCouponCode, addItem, decItem, clear } = useCartStore();
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const rid = orderingRestaurantId.trim();
  const tcode = orderingTableCode.trim();
  const hasTableId = Boolean(tcode);

  const [appliedCoupon, setAppliedCoupon] = React.useState<{
    code: string;
    discountCents: number;
  } | null>(null);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [usePrepaid, setUsePrepaid] = React.useState(false);
  const [prepaidTxnRef, setPrepaidTxnRef] = React.useState("");
  const hasPrepaidDetails = Boolean(prepaidConfig?.upiQrUrl?.trim());

  const subtotal = cartSubtotalCents(lines);

  const validateCoupon = useMutation({
    mutationFn: () =>
      api.customer.validateCoupon({
        restaurantId: rid || "unknown",
        code: couponCode.trim(),
        subtotalCents: subtotal,
      }),
    onSuccess: (res) => {
      if (res.valid) {
        setAppliedCoupon({ code: couponCode.trim(), discountCents: res.discountCents });
        toast.success(res.message ?? "Coupon applied");
      } else {
        setAppliedCoupon(null);
        toast.error(res.message ?? "Invalid coupon");
      }
    },
    onError: () => {
      setAppliedCoupon(null);
      toast.error("Failed to validate coupon");
    },
  });

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const totalCents = appliedCoupon ? Math.max(0, subtotal - appliedCoupon.discountCents) : subtotal;

  const prevSubtotalRef = React.useRef(subtotal);
  React.useEffect(() => {
    if (prevSubtotalRef.current !== subtotal && appliedCoupon) {
      setAppliedCoupon(null);
    }
    prevSubtotalRef.current = subtotal;
  }, [subtotal, appliedCoupon]);

  const place = useMutation({
    mutationFn: () => {
      const name = customerName.trim();
      const phone = customerPhone.trim();
      const email = customerEmail.trim();
      if (phone && !/^\d{10}$/.test(phone)) {
        throw new Error("Enter a valid 10-digit phone number");
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Enter a valid email address");
      }
      if (usePrepaid && !prepaidTxnRef.trim()) {
        throw new Error("Enter UPI transaction reference for prepaid");
      }
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }
      return api.customer.placeOrder({
        restaurantId: rid || "unknown",
        tableCode: tcode || "unknown",
        idempotencyKey: idempotencyKeyRef.current,
        couponCode: appliedCoupon?.code || couponCode || undefined,
        customerName: name || undefined,
        customerPhone: phone || undefined,
        customerEmail: email || undefined,
        ...(!omitCustomerOrderMergeFlag ? { mergeIntoOpenSession: true } : {}),
        prepaid: usePrepaid
          ? {
              method: "UPI_BANK",
              status: "VERIFIED",
              referenceId: prepaidTxnRef.trim(),
              transactionId: prepaidTxnRef.trim(),
            }
          : undefined,
        lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
      });
    },
    onSuccess: (res) => {
      const msg = res.idempotentReplay
        ? `Order already placed (#${res.orderId})`
        : res.merged
          ? `Items added to your table order (#${res.orderId})`
          : `Order placed (#${res.orderId})`;
      toast.success(msg);
      idempotencyKeyRef.current = null;
      setAppliedCoupon(null);
      setUsePrepaid(false);
      setPrepaidTxnRef("");
      clear();
    },
    onError: (e) => {
      const err = e as ApiError;
      if (err.status == null && err.message) {
        toast.error(err.message);
        return;
      }
      const hint =
        err.errorCode === "TABLE_NOT_FOUND"
          ? " This table is not recognized for this venue—open the link from your table QR or pick a table from the list."
          : "";
      toast.error(
        (err.message?.trim() || "Failed to place order.") +
          hint +
          " Retry will use the same request key.",
      );
    },
  });

  React.useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [rid, tcode, lines, couponCode, appliedCoupon?.code]);

  const lineCount = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.55)] transition-all",
          "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        <ShoppingBag className="size-[18px]" />
        <span>Cart</span>
        <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs tabular-nums">
          {lineCount}
        </span>
        <span className="ml-auto font-bold tabular-nums">{formatMoneyFromCents(totalCents)}</span>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full max-h-dvh w-[min(100vw,28rem)] flex-col gap-0 border-l border-black/[0.06] p-0 dark:border-white/[0.08]"
        showCloseButton
      >
        <SheetHeader className="shrink-0 border-b border-black/[0.06] px-5 py-4 pr-12 text-left dark:border-white/[0.08]">
          <SheetTitle className="text-lg font-medium tracking-tight">Your cart</SheetTitle>
          <p className="text-[13px] font-normal text-muted-foreground">
            Review items and place your order.
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
              <ShoppingBag className="mx-auto size-8 text-muted-foreground/70" />
              <p className="mt-3 text-sm font-medium text-foreground">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">Add dishes from the menu to continue.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {lines.map((l) => (
                  <div
                    key={l.itemId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.04] bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoneyFromCents(l.priceCents)} each
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        className="size-8"
                        onClick={() => decItem(l.itemId)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="min-w-7 text-center text-sm font-semibold tabular-nums">
                        {l.qty}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        className="size-8"
                        onClick={() =>
                          addItem({ id: l.itemId, name: l.name, priceCents: l.priceCents })
                        }
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-black/[0.04] bg-muted/40 p-4 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Ticket className="size-4 text-primary" />
                  Coupon
                </div>
                {appliedCoupon ? (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <span className="font-medium">
                      {appliedCoupon.code}{" "}
                      <span className="opacity-90">
                        (−{formatMoneyFromCents(appliedCoupon.discountCents)})
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={removeCoupon}
                      aria-label="Remove coupon"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. WELCOME10"
                      className="h-9 flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      disabled={!couponCode.trim() || validateCoupon.isPending}
                      onClick={() => validateCoupon.mutate()}
                    >
                      {validateCoupon.isPending ? "…" : "Apply"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-black/[0.04] bg-muted/20 p-4 dark:border-white/[0.06]">
                <div className="text-sm font-medium text-foreground">Customer details</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Name (optional)"
                    autoComplete="name"
                  />
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone (10 digits)"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>
                <Input
                  className="mt-2"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Email (optional)"
                  autoComplete="email"
                />
              </div>

              {hasPrepaidDetails ? (
                <div className="rounded-xl border border-black/[0.04] bg-muted/20 p-4 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <WalletCards className="size-4 text-primary" />
                    Prepaid via UPI
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    UPI ID: <span className="font-medium text-foreground">{prepaidConfig?.upiId}</span>
                    {prepaidConfig?.upiName ? ` (${prepaidConfig.upiName})` : ""}
                  </p>
                  {prepaidConfig?.upiQrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={prepaidConfig.upiQrUrl}
                      alt="UPI QR code"
                      className="mt-2 h-32 w-32 rounded-md border border-border/60 object-cover"
                    />
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant={usePrepaid ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setUsePrepaid((v) => !v)}
                    >
                      {usePrepaid ? "Prepaid selected" : "Use prepaid"}
                    </Button>
                    <Input
                      value={prepaidTxnRef}
                      onChange={(e) => setPrepaidTxnRef(e.target.value)}
                      placeholder="UPI transaction ref"
                      disabled={!usePrepaid}
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-black/[0.04] bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06]">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoneyFromCents(subtotal)}
                    </span>
                  </div>
                  {appliedCoupon ? (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Discount</span>
                      <span className="tabular-nums">
                        −{formatMoneyFromCents(appliedCoupon.discountCents)}
                      </span>
                    </div>
                  ) : null}
                  <Separator className="my-1" />
                  <div className="flex justify-between text-base font-semibold text-foreground">
                    <span>Total</span>
                    <span className="tabular-nums">{formatMoneyFromCents(totalCents)}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-4 w-full"
                  size="lg"
                  disabled={place.isPending || lines.length === 0 || !hasTableId}
                  onClick={() => place.mutate()}
                >
                  {!hasTableId
                    ? "Select table to place order"
                    : place.isPending
                      ? "Placing order…"
                      : "Place order"}
                </Button>
                <Button type="button" className="mt-2 w-full" variant="outline" onClick={() => clear()}>
                  Clear cart
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
