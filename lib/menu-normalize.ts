import type { MenuCategory, MenuItem } from "@/types/menu";

/**
 * Maps common API shapes (camelCase / snake_case / alternate keys) to our menu types.
 */
export function normalizeAdminMenuPayload(data: unknown): {
  categories: MenuCategory[];
  items: MenuItem[];
} {
  if (!data || typeof data !== "object") return { categories: [], items: [] };
  const d = data as Record<string, unknown>;

  const rawCats = d.categories ?? d.menuCategories ?? d.menu_categories;
  const rawItems = d.items ?? d.menuItems ?? d.menu_items;

  const categories: MenuCategory[] = Array.isArray(rawCats)
    ? rawCats
        .map((c): MenuCategory | null => {
          if (!c || typeof c !== "object") return null;
          const x = c as Record<string, unknown>;
          const id = x.id ?? x.categoryId ?? x.category_id;
          const name = x.name ?? x.title ?? x.label;
          if (typeof id !== "string" || typeof name !== "string") return null;
          const vis = x.visible ?? x.showOnMenu ?? x.show_on_menu ?? x.public ?? x.guestVisible ?? x.guest_visible;
          const visibleOnPublicMenu = vis === undefined ? undefined : Boolean(vis);
          return { id, name, visibleOnPublicMenu };
        })
        .filter((c): c is MenuCategory => c != null)
    : [];

  const items: MenuItem[] = Array.isArray(rawItems)
    ? rawItems
        .map((it): MenuItem | null => {
          if (!it || typeof it !== "object") return null;
          const x = it as Record<string, unknown>;
          const id = x.id;
          const categoryId = x.categoryId ?? x.category_id;
          const name = x.name;
          const priceRaw = x.priceCents ?? x.price_cents;
          const available = x.available ?? true;
          const description = x.description;
          const imageUrl = x.imageUrl ?? x.image_url;
          if (typeof id !== "string" || typeof categoryId !== "string" || typeof name !== "string") {
            return null;
          }
          const priceCents =
            typeof priceRaw === "number"
              ? priceRaw
              : typeof priceRaw === "string"
                ? Number.parseInt(priceRaw, 10)
                : Number.NaN;
          if (!Number.isFinite(priceCents)) return null;
          return {
            id,
            categoryId,
            name,
            description: typeof description === "string" ? description : undefined,
            imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
            priceCents,
            available: Boolean(available),
          };
        })
        .filter((it): it is MenuItem => it != null)
    : [];

  return { categories, items };
}
