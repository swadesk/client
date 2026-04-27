import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Restaurant as ApiRestaurant } from "@/types/restaurant";

export type Restaurant = Pick<ApiRestaurant, "id" | "name" | "logoUrl" | "roomSections">;

type RestaurantState = {
  restaurants: Restaurant[];
  activeRestaurantId: string | null;
  setRestaurants: (restaurants: Pick<Restaurant, "id" | "name" | "logoUrl" | "roomSections">[]) => void;
  setActiveRestaurantId: (id: string) => void;
};

export const useRestaurantStore = create<RestaurantState>()(
  persist(
    (set) => ({
      restaurants: [],
      activeRestaurantId: null,
      setRestaurants: (restaurants) =>
        set((state) => {
          const first = restaurants[0]?.id ?? null;
          const prev = state.activeRestaurantId;
          const next =
            prev && restaurants.some((r) => r.id === prev) ? prev : first;
          return { restaurants, activeRestaurantId: next };
        }),
      setActiveRestaurantId: (activeRestaurantId) => set({ activeRestaurantId }),
    }),
    { name: "qryte.restaurant" },
  ),
);

export function useActiveRestaurant() {
  const { restaurants, activeRestaurantId } = useRestaurantStore();
  return restaurants.find((r) => r.id === activeRestaurantId) ?? null;
}
