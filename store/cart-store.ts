import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem } from "@/types/menu";

export type CartLine = {
  itemId: string;
  name: string;
  priceCents: number;
  qty: number;
};

type CartState = {
  restaurantId: string | null;
  tableId: string | null;
  couponCode: string;
  lines: CartLine[];
  setContext: (restaurantId: string, tableId: string) => void;
  setCouponCode: (code: string) => void;
  addItem: (item: Pick<MenuItem, "id" | "name" | "priceCents">) => void;
  decItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      tableId: null,
      couponCode: "",
      lines: [],
      setContext: (restaurantId, tableId) =>
        set({ restaurantId, tableId }),
      setCouponCode: (couponCode) => set({ couponCode }),
      addItem: (item) => {
        const { lines } = get();
        const existing = lines.find((l) => l.itemId === item.id);
        if (existing) {
          set({
            lines: lines.map((l) =>
              l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l,
            ),
          });
          return;
        }
        set({
          lines: [
            ...lines,
            {
              itemId: item.id,
              name: item.name,
              priceCents: item.priceCents,
              qty: 1,
            },
          ],
        });
      },
      decItem: (itemId) => {
        const { lines } = get();
        const line = lines.find((l) => l.itemId === itemId);
        if (!line) return;
        if (line.qty <= 1) {
          set({ lines: lines.filter((l) => l.itemId !== itemId) });
          return;
        }
        set({
          lines: lines.map((l) =>
            l.itemId === itemId ? { ...l, qty: l.qty - 1 } : l,
          ),
        });
      },
      removeItem: (itemId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.itemId !== itemId) })),
      clear: () =>
        set({
          couponCode: "",
          lines: [],
        }),
    }),
    {
      name: "qryte.cart",
      partialize: (s) => ({
        restaurantId: s.restaurantId,
        tableId: s.tableId,
        couponCode: s.couponCode,
        lines: s.lines,
      }),
    },
  ),
);

export function cartSubtotalCents(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}

