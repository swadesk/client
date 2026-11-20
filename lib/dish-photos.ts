import { DISH_PHOTO_BY_NAME, KNOWN_MISSING_UPLOADS } from "@/lib/dish-photos.generated";

/** Lowercase, collapsed whitespace. Keys in the bundled photo map use this form. */
export function normalizeDishName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Photo shipped with the Next.js app for this dish, if we have one. */
export function bundledDishPhoto(name: string | null | undefined): string | undefined {
  if (!name?.trim()) return undefined;
  return DISH_PHOTO_BY_NAME[normalizeDishName(name)];
}

/**
 * True when this URL points at an API upload we already know is gone
 * (Railway disk does not keep `/uploads` files across deploys).
 */
export function isKnownMissingUpload(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split("?")[0] ?? "";
  const slash = path.lastIndexOf("/");
  const file = slash >= 0 ? path.slice(slash + 1) : path;
  if (!file) return false;
  try {
    return KNOWN_MISSING_UPLOADS.has(decodeURIComponent(file));
  } catch {
    return KNOWN_MISSING_UPLOADS.has(file);
  }
}

/**
 * Ordered image URLs to try for a menu item.
 * A bundled dish photo is used immediately when the saved upload is a known 404,
 * so the guest menu does not wait on the API disk. A newly uploaded file (new
 * filename) is still tried first.
 */
export function menuPhotoChain(input: {
  remote?: string | null;
  name?: string | null;
}): string[] {
  const remote = input.remote?.trim() || undefined;
  const bundled = bundledDishPhoto(input.name);
  const chain: string[] = [];
  if (remote && !(bundled && isKnownMissingUpload(remote))) chain.push(remote);
  if (bundled && !chain.includes(bundled)) chain.push(bundled);
  return chain;
}
