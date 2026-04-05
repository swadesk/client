/** Read `?restaurantId=` from a Route Handler request. */
export function restaurantIdFromRequest(req: Request): string | null {
  const u = new URL(req.url);
  const id = u.searchParams.get("restaurantId");
  return id?.trim() || null;
}
