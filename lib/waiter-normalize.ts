import type { Waiter } from "@/types/waiter";

/** Map common API aliases onto `photoUrl` so avatars render. */
export function normalizeWaiterFromApi(w: Waiter): Waiter {
  const ext = w as Waiter & Record<string, unknown>;
  const candidates = [
    ext.photoUrl,
    ext.photo,
    ext.avatarUrl,
    ext.imageUrl,
    ext.photo_url,
    ext.avatar_url,
  ];
  const found = candidates.find((x) => typeof x === "string" && x.trim());
  if (found) return { ...w, photoUrl: found.trim() };
  return w;
}
