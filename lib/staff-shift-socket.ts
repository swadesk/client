"use client";

import { getKitchenSocket } from "@/lib/socket";
import type { StaffRoleApi } from "@/types/auth";

/**
 * Client → server event (Socket.IO `/kitchen` namespace).
 *
 * ## Backend (required for admins to see updates)
 * - Handle incoming `staff.shift` with JWT + `restaurantId` (same as kitchen).
 * - Validate `payload.restaurantId` matches the connection’s venue.
 * - Broadcast to managers/admins for that venue, e.g. `io.to("restaurant:" + id).emit("staff.shift", payload)`
 *   (omit loopback to sender if you don’t want duplicate toasts).
 * - Optional: persist in DB for attendance reports.
 */
export type StaffShiftSocketAction =
  | "shift_started"
  | "break_started"
  | "break_ended"
  | "shift_ended";

export type StaffShiftSocketPayload = {
  restaurantId: string;
  staffUserId: string;
  staffName: string;
  role: StaffRoleApi | null;
  action: StaffShiftSocketAction;
  at: string;
};

export function emitStaffShiftEvent(
  restaurantId: string | null,
  token: string | null,
  payload: Omit<StaffShiftSocketPayload, "at" | "restaurantId"> & { at?: string },
): void {
  if (!restaurantId || !token) return;
  const body: StaffShiftSocketPayload = {
    ...payload,
    restaurantId,
    at: payload.at ?? new Date().toISOString(),
  };
  const s = getKitchenSocket(restaurantId, token);
  if (!s) return;
  const send = () => {
    if (s.connected) s.emit("staff.shift", body);
  };
  if (s.connected) send();
  else s.once("connect", send);
}

const STAFF_SHIFT_ACTIONS = new Set<StaffShiftSocketAction>([
  "shift_started",
  "break_started",
  "break_ended",
  "shift_ended",
]);

/** Best-effort parse for server-broadcast `staff.shift` payloads. */
export function parseStaffShiftSocketPayload(raw: unknown): StaffShiftSocketPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<StaffShiftSocketPayload> & { role?: StaffRoleApi | null };
  if (
    typeof p.restaurantId !== "string" ||
    typeof p.staffUserId !== "string" ||
    typeof p.at !== "string" ||
    typeof p.action !== "string" ||
    !STAFF_SHIFT_ACTIONS.has(p.action as StaffShiftSocketAction)
  ) {
    return null;
  }
  return {
    restaurantId: p.restaurantId,
    staffUserId: p.staffUserId,
    staffName: typeof p.staffName === "string" ? p.staffName : "",
    role: p.role ?? null,
    action: p.action,
    at: p.at,
  };
}

export function getStaffShiftInboxLabel(payload: StaffShiftSocketPayload): string {
  const who = payload.staffName?.trim() || "A team member";
  switch (payload.action) {
    case "shift_started":
      return `${who} started their shift`;
    case "break_started":
      return `${who} went on break`;
    case "break_ended":
      return `${who} resumed work`;
    case "shift_ended":
      return `${who} ended their shift`;
    default:
      return `${who} updated shift status`;
  }
}
