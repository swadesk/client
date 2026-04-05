/**
 * Curated Unsplash URLs (images.unsplash.com) — used for mock menu items.
 * Keep `w`/`q` params for stable CDN behaviour.
 */
export const MENU_IMAGES = {
  curry: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80",
  biryani: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80",
  tandoor: "https://images.unsplash.com/photo-1604908812184-2a7b9e7a3f0c?auto=format&fit=crop&w=1200&q=80",
  thali: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  /** South Indian / flatbread — stable generic food shot */
  south: "https://images.unsplash.com/photo-1589301760014-d929a3972157?auto=format&fit=crop&w=1200&q=80",
  breakfast: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=1200&q=80",
} as const;

/** When remote images fail, menu components fall back to this (local). */
export const MENU_IMAGE_FALLBACK = "/images/menu-placeholder.svg" as const;
