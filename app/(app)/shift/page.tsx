"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Coffee, LogIn, LogOut, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";
import { useStaffShiftStore, EMPTY_USER_SHIFT } from "@/store/staff-shift-store";
import { emitStaffShiftEvent, type StaffShiftSocketAction } from "@/lib/staff-shift-socket";
import { toast } from "sonner";

export default function ShiftPage() {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const canView = canAccessRouteForUser(user, "/shift");
  const floorStaff =
    user?.globalRole !== "SuperAdmin" &&
    (user?.role === "Waiter" || user?.role === "Manager" || user?.role === "Kitchen");
  const userId = user?.id ?? "";
  const shiftSlice = useStaffShiftStore((s) => s.byUserId[userId]);
  const clockIn = useStaffShiftStore((s) => s.clockIn);
  const clockOut = useStaffShiftStore((s) => s.clockOut);
  const setOnBreak = useStaffShiftStore((s) => s.setOnBreak);
  const shift = shiftSlice ?? EMPTY_USER_SHIFT;

  const pingAdmins = React.useCallback(
    (action: StaffShiftSocketAction) => {
      if (!restaurantId || !userId || !user) return;
      emitStaffShiftEvent(restaurantId, accessToken ?? null, {
        staffUserId: userId,
        staffName: user.name ?? "Staff member",
        role: user.role,
        action,
      });
    },
    [restaurantId, accessToken, userId, user],
  );

  React.useEffect(() => {
    if (user && !canView) router.replace(getPostAuthRedirectPath(user));
  }, [user, canView, router]);

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader title="Shift" description="Clock in, breaks, and end of shift." />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to use shift tracking."
        />
      </div>
    );
  }

  if (user && !canView) {
    return (
      <EmptyState
        title="Shift"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  if (!floorStaff || !userId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Shift"
          description="Attendance for floor and kitchen staff (waiters, managers, kitchen)."
        />
        <EmptyState
          title="Not available for your role"
          description="Shift tracking is for waiters, managers, and kitchen staff. Use your workspace home for other roles."
          primaryAction={{ label: "Go back", onClick: () => router.push(getPostAuthRedirectPath(user)) }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="Shift"
        description="Start and end your shift, take breaks. Times stay on this device until payroll APIs are connected."
      />

      <Card className="rounded-2xl border border-black/[0.06] bg-card shadow-sm dark:border-white/[0.08]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <LogIn className="size-4 text-primary" />
            Attendance
          </CardTitle>
          <CardDescription>
            {shift.clockInAt
              ? `On shift since ${new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(shift.clockInAt))}${shift.onBreak ? " • You’re on break" : ""}`
              : "Start your shift to track when you began (stored on this device)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {!shift.clockInAt ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                clockIn(userId);
                toast.success("Shift started");
                pingAdmins("shift_started");
              }}
            >
              <LogIn className="mr-2 size-4" />
              Start shift
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant={shift.onBreak ? "default" : "secondary"}
                onClick={() => {
                  const nextBreak = !shift.onBreak;
                  setOnBreak(userId, nextBreak);
                  if (nextBreak) {
                    toast.success("You’re on break");
                    pingAdmins("break_started");
                  } else {
                    toast.success("Back on the floor");
                    pingAdmins("break_ended");
                  }
                }}
              >
                {shift.onBreak ? (
                  <>
                    <Play className="mr-2 size-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Coffee className="mr-2 size-4" />
                    Take a break
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  clockOut(userId);
                  toast.success("Shift ended");
                  pingAdmins("shift_ended");
                }}
              >
                <LogOut className="mr-2 size-4" />
                End shift
              </Button>
            </>
          )}
          <p className="text-xs text-muted-foreground sm:ml-auto sm:max-w-md">
            Admins and managers get header alerts and toasts once your backend relays the kitchen-socket{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.65rem]">staff.shift</code> event to
            their sessions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
