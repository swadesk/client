/**
 * Absolute URL for the guest QR ordering page for a table.
 * Prefer NEXT_PUBLIC_APP_URL (canonical custom domain, e.g. https://namasqr.com)
 * so room QR codes stay on the primary domain even when admin is opened via
 * the Netlify alias (swadesk.netlify.app).
 */
export function getPublicWebAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function buildQrMenuUrl(restaurantId: string, tableId: string): string {
  const origin = getPublicWebAppOrigin();
  const path = `/qr-menu/${encodeURIComponent(restaurantId)}/${encodeURIComponent(tableId)}`;
  return origin ? `${origin}${path}` : path;
}
