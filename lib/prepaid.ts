type PrepaidLike = {
  prepaid?: { status?: string } | null;
  prepaidStatus?: string | null;
  isPrepaid?: boolean | null;
};

/** Best-effort prepaid detector across current + legacy backend shapes. */
export function isPrepaidEntity(entity: PrepaidLike | null | undefined): boolean {
  if (!entity) return false;
  if (entity.isPrepaid === true) return true;
  const status = (entity.prepaid?.status ?? entity.prepaidStatus ?? "").toUpperCase();
  return status === "PENDING" || status === "VERIFIED";
}

export function isVerifiedPrepaid(entity: PrepaidLike | null | undefined): boolean {
  if (!entity) return false;
  const status = (entity.prepaid?.status ?? entity.prepaidStatus ?? "").toUpperCase();
  return status === "VERIFIED";
}
