"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fetchKitchenOrdersList } from "@/lib/floor-orders";
import { qk } from "@/lib/query-keys";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState, KitchenBoardSkeleton } from "@/components/shared/query-state";
import { KitchenBoard } from "@/components/features/kitchen/kitchen-board";
import { EmptyState } from "@/components/shared/empty-state";
import { useRealtimeOrders } from "@/lib/realtime";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WaiterUpdateOrderRequest } from "@/types/api";
import type { Order } from "@/types/order";
import type { KitchenPendingOrdersGetResponse } from "@/types/api";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";

export default function KitchenPage() {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const canViewKitchen = canAccessRouteForUser(user, "/kitchen");
  const qc = useQueryClient();
  const [statusOverrides, setStatusOverrides] = React.useState<Record<string, Order["status"]>>({});
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);
  useRealtimeOrders(restaurantId);

  React.useEffect(() => {
    if (user && !canViewKitchen) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewKitchen, router]);

  React.useEffect(() => {
    setStatusOverrides({});
  }, [restaurantId]);

  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: qk.kitchenOrders(restaurantId ?? ""),
    queryFn: () => fetchKitchenOrdersList(restaurantId!),
    enabled: !!restaurantId,
    refetchInterval: 10_000,
  });

  const mutation = useMutation({
    mutationFn: (payload: WaiterUpdateOrderRequest) => api.waiter.updateOrder(payload),
    onMutate: async (variables) => {
      const queryKey = qk.kitchenOrders(variables.restaurantId);
      await qc.cancelQueries({ queryKey });
      const previousOrders = qc.getQueryData<KitchenPendingOrdersGetResponse>(queryKey);
      const optimisticOrders: Order[] = (previousOrders ?? []).map((o) =>
        o.id === variables.orderId ? { ...o, status: variables.status } : o,
      );
      setStatusOverrides((prev) => ({ ...prev, [variables.orderId]: variables.status }));
      qc.setQueryData(queryKey, optimisticOrders);
    },
    onError: () => {
      // Keep optimistic UI state even if API errors, to avoid snap-back UX.
      toast.error("Sync failed, retrying in background");
    },
    onSuccess: (_data, variables) => {
      toast.success("Order updated");
      const queryKey = qk.kitchenOrders(variables.restaurantId);
      // Align cache with server-accepted status without an immediate refetch (refetches can race with stale data).
      qc.setQueryData<KitchenPendingOrdersGetResponse>(queryKey, (old) => {
        if (!old) return old;
        return old.map((o) =>
          o.id === variables.orderId ? { ...o, status: variables.status } : o,
        );
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string) => api.admin.deleteOrder(restaurantId!, orderId),
    onSuccess: (_data, orderId) => {
      const rid = restaurantId;
      if (!rid) return;
      toast.success("Order deleted");
      setOrderToDelete(null);
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      qc.setQueryData<KitchenPendingOrdersGetResponse>(qk.kitchenOrders(rid), (old) =>
        old ? old.filter((o) => o.id !== orderId) : old,
      );
      void qc.invalidateQueries({ queryKey: qk.kitchenOrders(rid) });
      void qc.invalidateQueries({ queryKey: ["admin.orders", rid, "completed"] });
      void qc.invalidateQueries({ queryKey: ["admin.orders", rid, "all"] });
    },
    onError: () => toast.error("Failed to delete order"),
  });

  const orders = React.useMemo(() => {
    return (data ?? []).map((order) => {
      const override = statusOverrides[order.id];
      if (!override || override === order.status) return order;
      return { ...order, status: override };
    });
  }, [data, statusOverrides]);

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Kitchen Display"
          description="Large, glanceable cards for kitchen staff."
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to load its kitchen queue."
        />
      </div>
    );
  }
  if (user && !canViewKitchen) {
    return (
      <EmptyState
        title="Kitchen view is restricted"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="Kitchen Display"
        description="Large, glanceable cards for kitchen staff."
        actions={
          <div className="text-xs text-muted-foreground">Auto refresh every 10s</div>
        }
      />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        empty={false}
        errorFallbackMessage="Failed to load kitchen orders."
        loadingSkeleton={<KitchenBoardSkeleton />}
        className="space-y-12"
      >
        <KitchenBoard
          orders={orders}
          restaurantId={restaurantId}
          onOrderStatusChange={(orderId, status) =>
            mutation.mutate({ restaurantId, orderId, status })
          }
          onOrderDelete={(orderId) => {
            const o = orders.find((x) => x.id === orderId);
            if (o) setOrderToDelete(o);
          }}
        />
      </QueryState>

      <Dialog open={!!orderToDelete} onOpenChange={(o) => !o && setOrderToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete order?</DialogTitle>
            <DialogDescription>
              This removes the order for Table {orderToDelete?.tableNumber} from the kitchen queue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="secondary" onClick={() => setOrderToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteOrderMutation.isPending}
              onClick={() => {
                if (orderToDelete) deleteOrderMutation.mutate(orderToDelete.id);
              }}
            >
              {deleteOrderMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
