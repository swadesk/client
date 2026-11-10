/**
 * NamasQR API origin (no trailing slash), e.g. http://localhost:8000
 * REST paths are prefixed with /api on the server.
 */
export function getApiOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (typeof raw !== "string") return undefined;
  let t = raw.trim().replace(/\/$/, "");
  if (!t) return undefined;
  // Netlify UI often stores host-only values; treat as https so fetch is not same-origin relative.
  if (!/^https?:\/\//i.test(t)) {
    t = `https://${t}`;
  }
  return t;
}
