"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getKitchenSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";
import { useRestaurantStore } from "@/store/restaurant-store";
import {
  getStaffShiftInboxLabel,
  parseStaffShiftSocketPayload,
  type StaffShiftSocketPayload,
} from "@/lib/staff-shift-socket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ShiftNotificationItem = {
  id: string;
  payload: StaffShiftSocketPayload;
  receivedAt: number;
};

export function StaffShiftNotificationBell() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const [items, setItems] = React.useState<ShiftNotificationItem[]>([]);
  const [open, setOpen] = React.useState(false);

  const canSee =
    !!user?.id &&
    (user.globalRole === "SuperAdmin" || user.role === "Admin" || user.role === "Manager");

  const appendAlert = React.useCallback((payload: StaffShiftSocketPayload) => {
    const text = getStaffShiftInboxLabel(payload);
    const timeShort = new Date(payload.at).toLocaleTimeString(undefined, { timeStyle: "short" });
    const id = crypto.randomUUID();
    setItems((prev) =>
      [{ id, payload, receivedAt: Date.now() }, ...prev].slice(0, 20),
    );
    toast.info(text, {
      id: `staff-shift:${payload.staffUserId}:${payload.action}:${payload.at}`,
      description: `${timeShort} · Team`,
      duration: 8000,
      action: {
        label: "Team",
        onClick: () => router.push("/waiters"),
      },
    });
  }, [router]);

  React.useEffect(() => {
    if (!canSee || !user?.id) return;
    const socket = getKitchenSocket(restaurantId, token);
    if (!socket) return;

    const onShift = (raw: unknown) => {
      const payload = parseStaffShiftSocketPayload(raw);
      if (!payload) return;
      if (restaurantId && payload.restaurantId !== restaurantId) return;
      if (payload.staffUserId === user.id) return;
      appendAlert(payload);
    };

    socket.on("staff.shift", onShift);
    return () => {
      socket.off("staff.shift", onShift);
    };
  }, [appendAlert, canSee, restaurantId, token, user?.id]);

  if (!canSee) return null;

  const unreadCount = items.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-xl hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Team shift notifications"
      >
        <Users className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex size-2 rounded-full bg-amber-500" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Shift & break</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {unreadCount === 0 ? (
            <DropdownMenuItem disabled>No shift updates yet</DropdownMenuItem>
          ) : (
            items.map((item) => {
              const { payload } = item;
              const roleSuffix = payload.role ? ` · ${payload.role}` : "";
              return (
                <DropdownMenuItem
                  key={item.id}
                  className="flex-col items-start gap-1 py-2.5"
                  onClick={() => {
                    setItems((prev) => prev.filter((n) => n.id !== item.id));
                    router.push("/waiters");
                    setOpen(false);
                  }}
                >
                  <span className="text-sm leading-snug">{getStaffShiftInboxLabel(payload)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(payload.at).toLocaleString([], {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {roleSuffix}
                  </span>
                  <span className="text-xs text-primary">View team</span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
