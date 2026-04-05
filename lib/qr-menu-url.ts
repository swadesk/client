/**
 * Absolute URL for the guest QR ordering page for a table.
 * Uses the current browser origin in the client; optional NEXT_PUBLIC_APP_URL for tooling/SSR.
 */
export function getPublicWebAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return fromEnv ?? "";
}

export function buildQrMenuUrl(restaurantId: string, tableId: string): string {
  const origin = getPublicWebAppOrigin();
  const path = `/qr-menu/${encodeURIComponent(restaurantId)}/${encodeURIComponent(tableId)}`;
  return origin ? `${origin}${path}` : path;
}
