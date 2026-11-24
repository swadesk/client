"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { playOrderAlert } from "@/lib/toast-sound";
import { getKitchenSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";
import { useRestaurantStore } from "@/store/restaurant-store";
import { fetchKitchenOrdersList } from "@/lib/floor-orders";
import type { Order } from "@/types/order";
import { qk } from "@/lib/query-keys";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationItem = {
  id: string;
  orderId?: string;
  text: string;
  createdAt: number;
  href: string;
};

type OrderCreatedPayload = {
  id?: string;
  orderId?: string;
  tableNumber?: number;
  merged?: boolean;
};

function getOrderText(payload: unknown) {
  const p = payload as OrderCreatedPayload | null;
  if (p?.merged && p.tableNumber != null) return `More items from table ${p.tableNumber}`;
  if (p?.tableNumber != null) return `New order from table ${p.tableNumber}`;
  if (p?.merged) return "More items added to an open order";
  return "New order placed";
}

function isMergedPayload(payload: unknown): boolean {
  return Boolean((payload as OrderCreatedPayload | null)?.merged);
}

function orderQty(order: Order): number {
  return order.items.reduce((sum, item) => sum + (item.qty || 0), 0);
}

function payloadQty(payload: unknown): number | null {
  const p = payload as { items?: { qty?: number }[]; totalItems?: number } | null;
  if (!p) return null;
  if (typeof p.totalItems === "number" && Number.isFinite(p.totalItems)) return p.totalItems;
  if (Array.isArray(p.items)) {
    return p.items.reduce((sum, item) => sum + (item.qty || 0), 0);
  }
  return null;
}

function getOrderId(payload: unknown): string | undefined {
  const p = payload as OrderCreatedPayload | null;
  if (typeof p?.orderId === "string" && p.orderId.trim()) return p.orderId;
  if (typeof p?.id === "string" && p.id.trim()) return p.id;
  return undefined;
}

export function OrderNotificationBell() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const seenOrderIdsRef = React.useRef<Set<string>>(new Set());
  const seenQtyRef = React.useRef<Map<string, number>>(new Map());
  const didPrimeSeenRef = React.useRef(false);
  const notifiedOrderIdsRef = React.useRef<Set<string>>(new Set());
  const recentMergeAtRef = React.useRef<Map<string, number>>(new Map());

  const unreadCount = items.length;
  const notificationsEnabled =
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";

  const pushNotification = React.useCallback(
    (payload: unknown, source: "socket" | "fallback") => {
      const text = getOrderText(payload);
      const orderId = getOrderId(payload);
      const merged = isMergedPayload(payload);
      const dedupeKey = !merged && orderId ? `${restaurantId}:${orderId}` : null;
      if (dedupeKey && notifiedOrderIdsRef.current.has(dedupeKey)) return;
      if (dedupeKey) notifiedOrderIdsRef.current.add(dedupeKey);

      if (merged && orderId) {
        const burstKey = `${restaurantId}:${orderId}`;
        const now = Date.now();
        const prevAt = recentMergeAtRef.current.get(burstKey) ?? 0;
        if (now - prevAt < 800) return;
        recentMergeAtRef.current.set(burstKey, now);
      }

      playOrderAlert();
      if (orderId) {
        seenOrderIdsRef.current.add(orderId);
        const qty = payloadQty(payload);
        if (qty != null) {
          const prevQty = seenQtyRef.current.get(orderId) ?? 0;
          seenQtyRef.current.set(orderId, Math.max(prevQty, qty));
        }
      }

      const id = crypto.randomUUID();
      setItems((prev) => [{ id, orderId, text, createdAt: Date.now(), href: "/orders" }, ...prev].slice(0, 15));

      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const detail = source === "fallback" ? `${time} • Synced` : `${time} • Live`;
      toast.success(text, {
        id: dedupeKey ?? `order-alert-${id}`,
        description: detail,
        duration: 7000,
        action: {
          label: "Open Orders",
          onClick: () => {
            router.push("/orders");
          },
        },
        className:
          "border-primary/20 bg-background/95 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]",
      });

      // Background: system notification comes from ToastSoundBridge when the window is hidden or unfocused.
    },
    [restaurantId, router],
  );

  React.useEffect(() => {
    if (user?.globalRole === "SuperAdmin") return;
    const socket = getKitchenSocket(restaurantId, token);
    if (!socket) return;

    const onOrderCreated = (payload: unknown) => {
      pushNotification(payload, "socket");
    };
    const onOrderUpdated = (payload: unknown) => {
      if (!isMergedPayload(payload)) return;
      pushNotification(payload, "socket");
    };

    socket.on("order:created", onOrderCreated);
    socket.on("order.created", onOrderCreated);
    socket.on("order:updated", onOrderUpdated);
    socket.on("order.updated", onOrderUpdated);
    return () => {
      socket.off("order:created", onOrderCreated);
      socket.off("order.created", onOrderCreated);
      socket.off("order:updated", onOrderUpdated);
      socket.off("order.updated", onOrderUpdated);
    };
  }, [pushNotification, restaurantId, token, user?.globalRole]);

  const ordersFallbackQuery = useQuery({
    queryKey: qk.kitchenOrders(restaurantId ?? ""),
    queryFn: () => fetchKitchenOrdersList(restaurantId!),
    enabled: !!restaurantId && !!token && user?.globalRole !== "SuperAdmin",
    // Fallback when socket events are not emitted by backend.
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  React.useEffect(() => {
    if (!restaurantId) {
      seenOrderIdsRef.current = new Set();
      seenQtyRef.current = new Map();
      didPrimeSeenRef.current = false;
      notifiedOrderIdsRef.current = new Set();
      recentMergeAtRef.current = new Map();
      return;
    }
    const orders = ordersFallbackQuery.data ?? [];
    if (!didPrimeSeenRef.current) {
      const ids = new Set(seenOrderIdsRef.current);
      const qty = new Map(seenQtyRef.current);
      for (const order of orders) {
        ids.add(order.id);
        const next = orderQty(order);
        const prev = qty.get(order.id);
        qty.set(order.id, prev == null ? next : Math.max(prev, next));
      }
      seenOrderIdsRef.current = ids;
      seenQtyRef.current = qty;
      didPrimeSeenRef.current = true;
      return;
    }
    const newlySeen = orders.filter((o) => !seenOrderIdsRef.current.has(o.id));
    const addedItems = orders.filter((o) => {
      const prevQty = seenQtyRef.current.get(o.id);
      return prevQty != null && orderQty(o) > prevQty;
    });

    for (const order of newlySeen.slice(0, 5)) {
      pushNotification({ orderId: order.id, tableNumber: order.tableNumber }, "fallback");
    }
    for (const order of addedItems.slice(0, 5)) {
      pushNotification(
        { orderId: order.id, tableNumber: order.tableNumber, merged: true },
        "fallback",
      );
    }

    const nextSeen = new Set(seenOrderIdsRef.current);
    const nextQty = new Map(seenQtyRef.current);
    for (const order of orders) {
      nextSeen.add(order.id);
      nextQty.set(order.id, orderQty(order));
    }
    seenOrderIdsRef.current = nextSeen;
    seenQtyRef.current = nextQty;
  }, [ordersFallbackQuery.data, pushNotification, restaurantId]);

  const requestNotifications = React.useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    await Notification.requestPermission();
  }, []);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DropdownMenuTrigger
        className="relative inline-flex size-11 items-center justify-center rounded-xl hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:size-9"
        aria-label="Order notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex size-2 rounded-full bg-red-500" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(18rem,calc(100vw-1rem))] rounded-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Order notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notificationsEnabled ? null : (
            <>
              <DropdownMenuItem onClick={requestNotifications}>Enable browser notifications</DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {unreadCount === 0 ? (
            <DropdownMenuItem disabled>No new orders</DropdownMenuItem>
          ) : (
            items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="flex-col items-start py-2"
                onClick={() => {
                  setItems((prev) => prev.filter((n) => n.id !== item.id));
                  router.push(item.href);
                  setOpen(false);
                }}
              >
                <span className="text-sm">{item.text}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString([], {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-xs text-primary">View orders</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
