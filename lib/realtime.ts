"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getKitchenSocket } from "@/lib/socket";
import { invalidateStaffTableQueries, qk } from "@/lib/query-keys";
import { useAuthStore } from "@/store/auth-store";

/**
 * When the kitchen socket is connected, invalidate kitchen orders for the active tenant.
 */
export function useRealtimeOrders(restaurantId: string | null) {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);

  React.useEffect(() => {
    const s = getKitchenSocket(restaurantId, token);
    if (!s) return;

    const onOrderChanged = () => {
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.kitchenOrders(restaurantId) });
        void qc.invalidateQueries({ queryKey: qk.floorOrders(restaurantId) });
        invalidateStaffTableQueries(qc, restaurantId);
        void qc.invalidateQueries({ queryKey: qk.billingByRestaurant(restaurantId) });
        void qc.invalidateQueries({ queryKey: ["admin.orders", restaurantId] });
      } else {
        void qc.invalidateQueries({ queryKey: ["kitchen.orders"] });
      }
    };

    const onPaymentCompleted = () => {
      if (!restaurantId) return;
      void qc.invalidateQueries({ queryKey: qk.kitchenOrders(restaurantId) });
      void qc.invalidateQueries({ queryKey: qk.floorOrders(restaurantId) });
      invalidateStaffTableQueries(qc, restaurantId);
      void qc.invalidateQueries({ queryKey: qk.billingByRestaurant(restaurantId) });
      void qc.invalidateQueries({ queryKey: ["billing.list", restaurantId] });
      void qc.invalidateQueries({ queryKey: ["invoice.detail", restaurantId] });
      void qc.invalidateQueries({ queryKey: ["admin.orders", restaurantId] });
    };

    const onBillingChanged = () => {
      if (!restaurantId) return;
      invalidateStaffTableQueries(qc, restaurantId);
      void qc.invalidateQueries({ queryKey: qk.billingByRestaurant(restaurantId) });
      void qc.invalidateQueries({ queryKey: ["billing.list", restaurantId] });
      void qc.invalidateQueries({ queryKey: ["invoice.detail", restaurantId] });
      void qc.invalidateQueries({ queryKey: ["admin.orders", restaurantId] });
    };

    s.on("order:created", onOrderChanged);
    s.on("order:updated", onOrderChanged);
    s.on("order.created", onOrderChanged);
    s.on("order.updated", onOrderChanged);
    s.on("payment.completed", onPaymentCompleted);
    s.on("bill.created", onBillingChanged);
    s.on("bill.updated", onBillingChanged);
    s.on("bill:created", onBillingChanged);
    s.on("bill:updated", onBillingChanged);
    s.on("invoice.created", onBillingChanged);
    s.on("invoice.updated", onBillingChanged);
    s.on("invoice:created", onBillingChanged);
    s.on("invoice:updated", onBillingChanged);

    return () => {
      s.off("order:created", onOrderChanged);
      s.off("order:updated", onOrderChanged);
      s.off("order.created", onOrderChanged);
      s.off("order.updated", onOrderChanged);
      s.off("payment.completed", onPaymentCompleted);
      s.off("bill.created", onBillingChanged);
      s.off("bill.updated", onBillingChanged);
      s.off("bill:created", onBillingChanged);
      s.off("bill:updated", onBillingChanged);
      s.off("invoice.created", onBillingChanged);
      s.off("invoice.updated", onBillingChanged);
      s.off("invoice:created", onBillingChanged);
      s.off("invoice:updated", onBillingChanged);
    };
  }, [qc, restaurantId, token]);
}
