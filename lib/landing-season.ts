export type LandingSeason = {
  id: "diwali" | "default";
  kicker: string;
  heroLine: string;
  support: string;
};

/**
 * Lightweight seasonal voice for the public homepage.
 * Diwali window: mid-Oct through mid-Nov (India festival period).
 */
export function getLandingSeason(now = new Date()): LandingSeason {
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  const isDiwali =
    month === 9 || // October
    (month === 10 && day <= 20); // early–mid November

  if (isDiwali) {
    return {
      id: "diwali",
      kicker: "Diwali season · light up every table",
      heroLine: "Festive rush, calm operations",
      support:
        "QR room ordering, kitchen sync, and billing — built for Indian hotels when guests arrive in waves.",
    };
  }

  return {
    id: "default",
    kicker: "Built for Indian hospitality",
    heroLine: "Tradition meets technology",
    support:
      "QR ordering, kitchen coordination, and outlet visibility in one workspace for high-volume service teams.",
  };
}
