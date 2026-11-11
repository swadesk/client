import { getApiOrigin } from "@/lib/api-origin";

/**
 * Turn API-returned media paths into a browser-loadable URL.
 * Relative `/uploads/...` (and `/api/uploads/...`) must hit the NamasQR API origin,
 * not the Next.js app host (localhost:3000 / Netlify).
 *
 * Also upgrades `http://` API hosts to `https://` (mixed content on namasqr.com)
 * and rewrites mistaken frontend-host upload URLs back to the API origin.
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  const t = url?.trim();
  if (!t) return undefined;

  const apiOrigin = getApiOrigin();

  if (t.startsWith("//")) {
    return resolveMediaUrl(`https:${t}`);
  }

  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const path = u.pathname + u.search;

      // Uploads accidentally stored against the Netlify/app host → API origin.
      if (
        apiOrigin &&
        /\/uploads\//i.test(u.pathname) &&
        (/\.netlify\.app$/i.test(u.hostname) ||
          /^((www\.)?namasqr\.com)$/i.test(u.hostname) ||
          u.hostname === "localhost" ||
          u.hostname === "127.0.0.1")
      ) {
        return `${apiOrigin}${path.startsWith("/") ? path : `/${path}`}`;
      }

      // Force https for Railway/API absolute URLs (mixed content on custom domain).
      if (u.protocol === "http:" && apiOrigin) {
        try {
          const apiHost = new URL(apiOrigin).hostname;
          if (u.hostname === apiHost || /\.up\.railway\.app$/i.test(u.hostname)) {
            u.protocol = "https:";
            return u.toString();
          }
        } catch {
          /* ignore */
        }
      }

      if (u.protocol === "http:" && /\.up\.railway\.app$/i.test(u.hostname)) {
        u.protocol = "https:";
        return u.toString();
      }

      return u.toString();
    } catch {
      return t;
    }
  }

  if (t.startsWith("/")) {
    if (apiOrigin) return `${apiOrigin}${t}`;
  }
  return t;
}
