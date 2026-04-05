/**
 * Formats amounts stored in the smallest currency unit (paise for INR).
 * Field names in types still use `priceCents` historically — values are paise for ₹.
 */
export function formatMoneyFromCents(
  paise: number,
  currency: string = "INR",
  locale = "en-IN",
) {
  const amount = paise / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Compact rupee for dense UI (no decimals). */
export function formatRupees(paise: number) {
  return formatMoneyFromCents(paise, "INR", "en-IN");
}
