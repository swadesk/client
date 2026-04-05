/**
 * NamasQR API origin (no trailing slash), e.g. http://localhost:8000
 * REST paths are prefixed with /api on the server.
 */
export function getApiOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  return t.replace(/\/$/, "");
}
