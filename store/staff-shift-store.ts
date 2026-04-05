import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserShift = {
  clockInAt: string | null;
  onBreak: boolean;
};

type StaffShiftState = {
  byUserId: Record<string, UserShift>;
  clockIn: (userId: string) => void;
  clockOut: (userId: string) => void;
  setOnBreak: (userId: string, onBreak: boolean) => void;
};

/** Stable default for selectors and fallbacks (avoid new object each read → React getSnapshot loops). */
export const EMPTY_USER_SHIFT: UserShift = Object.freeze({
  clockInAt: null,
  onBreak: false,
});

export const defaultUserShift = (): UserShift => ({ ...EMPTY_USER_SHIFT });

export const useStaffShiftStore = create<StaffShiftState>()(
  persist(
    (set) => ({
      byUserId: {},
      clockIn: (userId) =>
        set((s) => ({
          byUserId: {
            ...s.byUserId,
            [userId]: {
              ...(s.byUserId[userId] ?? defaultUserShift()),
              clockInAt: new Date().toISOString(),
              onBreak: false,
            },
          },
        })),
      clockOut: (userId) =>
        set((s) => {
          const next = { ...s.byUserId };
          next[userId] = { ...EMPTY_USER_SHIFT };
          return { byUserId: next };
        }),
      setOnBreak: (userId, onBreak) =>
        set((s) => ({
          byUserId: {
            ...s.byUserId,
            [userId]: {
              ...(s.byUserId[userId] ?? defaultUserShift()),
              onBreak,
            },
          },
        })),
    }),
    { name: "qryte.staff-shift" },
  ),
);
