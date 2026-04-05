"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getKitchenSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";
import { useActiveRestaurant, useRestaurantStore } from "@/store/restaurant-store";
import { fetchKitchenOrdersList } from "@/lib/floor-orders";
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
};

function getOrderText(payload: unknown) {
  const p = payload as OrderCreatedPayload | null;
  if (p?.tableNumber != null) return `New order from table ${p.tableNumber}`;
  return "New order placed";
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
  const activeRestaurant = useActiveRestaurant();
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const seenOrderIdsRef = React.useRef<Set<string>>(new Set());
  const didPrimeSeenRef = React.useRef(false);
  const notifiedOrderIdsRef = React.useRef<Set<string>>(new Set());

  const unreadCount = items.length;
  const notificationsEnabled =
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";

  const pushNotification = React.useCallback(
    (payload: unknown, source: "socket" | "fallback") => {
      const text = getOrderText(payload);
      const orderId = getOrderId(payload);
      const dedupeKey = orderId ? `${restaurantId}:${orderId}` : null;
      if (dedupeKey && notifiedOrderIdsRef.current.has(dedupeKey)) return;
      if (dedupeKey) notifiedOrderIdsRef.current.add(dedupeKey);

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

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const venue = activeRestaurant?.name ?? "your restaurant";
          new Notification(`New order at ${venue}`, {
            body: text,
            tag: dedupeKey ?? `order-created-${source}`,
          });
        } catch {
          // Ignore browser notification runtime errors; toast is primary UX.
        }
      }
    },
    [activeRestaurant?.name, restaurantId, router],
  );

  React.useEffect(() => {
    if (user?.globalRole === "SuperAdmin") return;
    const socket = getKitchenSocket(restaurantId, token);
    if (!socket) return;

    const onOrderCreated = (payload: unknown) => {
      pushNotification(payload, "socket");
    };

    socket.on("order:created", onOrderCreated);
    socket.on("order.created", onOrderCreated);
    return () => {
      socket.off("order:created", onOrderCreated);
      socket.off("order.created", onOrderCreated);
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
      didPrimeSeenRef.current = false;
      notifiedOrderIdsRef.current = new Set();
      return;
    }
    const orders = ordersFallbackQuery.data ?? [];
    if (!didPrimeSeenRef.current) {
      seenOrderIdsRef.current = new Set(orders.map((o) => o.id));
      didPrimeSeenRef.current = true;
      return;
    }
    const newlySeen = orders.filter((o) => !seenOrderIdsRef.current.has(o.id));
    if (newlySeen.length === 0) return;

    for (const order of newlySeen.slice(0, 5)) {
      pushNotification({ orderId: order.id, tableNumber: order.tableNumber }, "fallback");
    }

    const nextSeen = new Set(seenOrderIdsRef.current);
    for (const order of orders) nextSeen.add(order.id);
    seenOrderIdsRef.current = nextSeen;
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
        className="relative inline-flex size-9 items-center justify-center rounded-xl hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Order notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex size-2 rounded-full bg-red-500" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl">
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
