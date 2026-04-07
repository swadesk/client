import { getApiOrigin } from "@/lib/api-origin";

/**
 * Turn API-returned paths into a URL the browser can load.
 * Relative paths like `/api/uploads/...` must use the NamasQR origin, not the Next.js app host.
 */
export function resolveStaffAvatarUrl(url: string | null | undefined): string | undefined {
  const t = url?.trim();
  if (!t) return undefined;
  if (t.startsWith("//")) return `https:${t}`;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) {
    const origin = getApiOrigin();
    if (origin) return `${origin}${t}`;
  }
  return t;
}
