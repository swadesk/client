import type { MenuCategory, MenuItem } from "@/types/menu";

/**
 * Categories that should never appear on the public QR menu (POS/internal buckets).
 * Backend often exposes a "System" (or similar) category for non-guest items.
 */
function isCategoryHiddenFromQrMenu(c: MenuCategory): boolean {
  if (c.visibleOnPublicMenu === false) return true;

  const name = c.name.trim().toLowerCase();
  const id = c.id.trim().toLowerCase();

  if (name === "system" || name === "internal" || name === "__system") return true;
  if (id === "system" || id === "internal" || id === "__system") return true;

  // Convention: leading double-underscore = internal
  if (name.startsWith("__") || id.startsWith("__")) return true;

  return false;
}

/** Categories safe to show as QR tabs. */
export function filterCategoriesForQrMenu(categories: MenuCategory[]): MenuCategory[] {
  return categories.filter((c) => !isCategoryHiddenFromQrMenu(c));
}

/** Items in allowed categories only (drops items tied to hidden categories). */
export function filterItemsForQrMenu(
  items: MenuItem[],
  visibleCategories: MenuCategory[],
): MenuItem[] {
  const allowed = new Set(visibleCategories.map((c) => c.id));
  return items.filter((i) => allowed.has(i.categoryId));
}
