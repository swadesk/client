"use client";

import * as React from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { CheckCircle, Trash2 } from "lucide-react";
import type { Order, OrderStatus } from "@/types/order";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoneyFromCents } from "@/lib/format";
import { computeOrderMoneyTotals } from "@/lib/order-pricing";
import { groupOrderItemsForKitchen } from "@/lib/kitchen-batches";
import { cn } from "@/lib/utils";
import { isPrepaidEntity, isVerifiedPrepaid } from "@/lib/prepaid";
import {
  isAllowedKitchenTransition,
  kitchenFlowValidationMessage,
  orderStatusToKitchenFlow,
} from "@/lib/kitchen-status-flow";

export type KitchenColumnStatus = "Pending" | "Preparing" | "Ready";

function statusColor(status: OrderStatus) {
  if (status === "Pending") return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  if (status === "Preparing") return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  if (status === "Ready") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return "bg-muted text-muted-foreground";
}

export function OrderCard({
  order,
  onMarkPreparing,
  onMarkReady,
  onMarkComplete,
  onDelete,
  onKitchenStatusSet,
  compact,
  variant = "default",
}: {
  order: Order;
  compact?: boolean;
  variant?: "default" | "kds";
  onMarkPreparing?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void;
  onMarkComplete?: (orderId: string) => void;
  /** When set, shows a destructive delete action (confirm in parent). */
  onDelete?: (orderId: string) => void;
  /** KDS: tap targets to move ticket between kitchen columns (mobile-friendly). */
  onKitchenStatusSet?: (status: KitchenColumnStatus) => void;
}) {
  const ticketOrderId = order.kitchenParentOrderId ?? order.id;
  const age = formatDistanceToNowStrict(new Date(order.createdAt), { addSuffix: true });
  const createdAtIst = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(order.createdAt));
  const isKds = variant === "kds";
  const kitchenBatches = React.useMemo(
    () => (isKds ? groupOrderItemsForKitchen(order) : []),
    [isKds, order],
  );
  const maxItems = compact ? 2 : isKds ? order.items.length : 4;
  const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);
  const prepaid = isPrepaidEntity(order);
  const prepaidVerified = isVerifiedPrepaid(order);
  const { totalCents } = computeOrderMoneyTotals(order);

  return (
    <Card
      size={compact ? "sm" : "default"}
      className={cn(
        "rounded-2xl border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] dark:border-white/[0.08] dark:bg-white/[0.02]",
        isKds && "border-l-4 border-l-primary shadow-md",
      )}
    >
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle
            className={cn(
              "text-base",
              compact && "text-sm",
              isKds && "text-2xl font-bold tracking-tight md:text-3xl",
            )}
          >
            Table {order.tableNumber}
          </CardTitle>
          {order.kitchenTicketLabel && isKds ? (
            <p className="mt-1 text-sm font-semibold text-primary md:text-base">
              {order.kitchenTicketLabel}
            </p>
          ) : null}
          <div
            className={cn(
              "text-muted-foreground",
              isKds ? "text-base font-medium md:text-lg" : "text-xs",
            )}
          >
            {`${age} • ${createdAtIst} IST`}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border-transparent",
            statusColor(order.status),
            isKds && "px-3 py-1 text-sm font-semibold md:text-base",
          )}
        >
          {order.status}
        </Badge>
      </CardHeader>
      <CardContent className={cn("space-y-2", compact && "space-y-1")}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {prepaid ? (
            <Badge
              variant="secondary"
              className={cn(
                "h-5 rounded-md px-1.5 text-[10px] font-semibold uppercase tracking-wide",
                prepaidVerified
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              )}
            >
              {prepaidVerified ? "Prepaid" : "Prepaid pending"}
            </Badge>
          ) : null}
          <span>{totalItems} items</span>
          <span>•</span>
          <span>{formatMoneyFromCents(totalCents)}</span>
          <span>•</span>
          <span className="truncate">#{ticketOrderId.slice(-6).toUpperCase()}</span>
        </div>
        <div className="space-y-1">
          {isKds && kitchenBatches.length > 1 ? (
            <div className="mb-2 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-2 text-xs font-medium text-primary dark:border-primary/25 dark:bg-primary/10">
              Multiple guest submits — rounds are grouped below.
            </div>
          ) : null}
          {isKds && kitchenBatches.length > 0
            ? kitchenBatches.flatMap((batch) => {
                const header =
                  batch.label !== "" ? (
                    <div
                      key={`${batch.key}-hdr`}
                      className={cn(
                        "border-t border-dashed border-border pt-2 first:mt-0 first:border-t-0 first:pt-0",
                        "text-xs font-bold uppercase tracking-wide text-primary",
                        isKds && "md:text-sm",
                      )}
                    >
                      {batch.label}
                    </div>
                  ) : null;
                const rows = batch.items.map((it) => (
                  <div
                    key={it.id}
                    className={cn(
                      "flex items-center justify-between",
                      isKds ? "text-lg font-semibold md:text-xl" : "text-sm",
                    )}
                  >
                    <span className="truncate">
                      {it.qty}× {it.name}
                    </span>
                  </div>
                ));
                return header ? [header, ...rows] : rows;
              })
            : order.items.slice(0, maxItems).map((it) => (
                <div
                  key={it.id}
                  className={cn(
                    "flex items-center justify-between",
                    isKds ? "text-lg font-semibold md:text-xl" : "text-sm",
                  )}
                >
                  <span className="truncate">
                    {it.qty}× {it.name}
                  </span>
                </div>
              ))}
          {!isKds && order.items.length > maxItems ? (
            <div className={cn("text-muted-foreground", isKds ? "text-base" : "text-xs")}>
              +{order.items.length - maxItems} more
            </div>
          ) : null}
        </div>
        {isKds && onKitchenStatusSet ? (
          <div className="mt-4 border-t border-border/70 pt-3">
            <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Move ticket
            </p>
            <p className="mb-2 text-center text-[10px] leading-snug text-muted-foreground/90">
              {kitchenFlowValidationMessage()}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "Pending" as const, label: "Queue" },
                  { id: "Preparing" as const, label: "Prep" },
                  { id: "Ready" as const, label: "Ready" },
                ] as const
              ).map(({ id, label }) => {
                const flow = orderStatusToKitchenFlow(order.status);
                const active = flow === id;
                const allowed = isAllowedKitchenTransition(flow, id);
                const disabled = active || !allowed;
                return (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    disabled={disabled}
                    title={!active && !allowed ? kitchenFlowValidationMessage() : undefined}
                    className="min-h-11 touch-manipulation px-1 text-xs font-semibold sm:min-h-10"
                    onClick={() => onKitchenStatusSet(id)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
      </CardContent>
      {onMarkPreparing || onMarkReady || onMarkComplete || onDelete ? (
        <CardFooter className="flex flex-col flex-wrap gap-2 sm:flex-row sm:justify-end">
          {order.status === "Pending" && onMarkPreparing ? (
            <Button size="sm" variant="secondary" onClick={() => onMarkPreparing(order.id)}>
              Mark preparing
            </Button>
          ) : null}
          {order.status !== "Ready" && order.status !== "Completed" && onMarkReady ? (
            <Button
              size="sm"
              className="ring-2 ring-emerald-500/20"
              onClick={() => onMarkReady(order.id)}
            >
              <CheckCircle className="mr-1.5 size-4" />
              Mark ready
            </Button>
          ) : null}
          {order.status === "Ready" && onMarkComplete ? (
            <Button size="sm" variant="outline" onClick={() => onMarkComplete(order.id)}>
              Mark complete
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:ml-auto"
              onClick={() => onDelete(order.kitchenParentOrderId ?? order.id)}
            >
              <Trash2 className="mr-1.5 size-4" />
              Delete
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
