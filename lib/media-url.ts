import { getApiOrigin } from "@/lib/api-origin";

/**
 * Turn API-returned media paths into a browser-loadable URL.
 * Relative `/uploads/...` (and `/api/uploads/...`) must hit the NamasQR API origin,
 * not the Next.js app host (localhost:3000).
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
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
