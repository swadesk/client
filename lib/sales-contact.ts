/** Public sales contact — WhatsApp is the primary lead channel. */
export const SALES_WHATSAPP_E164 = "919078161888";
export const SALES_HOTLINE_DISPLAY = "+91 90781 61888";

export type DemoLeadDetails = {
  fullName: string;
  workEmail: string;
  phone: string;
  companyName: string;
  role: string;
  timeline: string;
  city?: string;
  country?: string;
  monthlyOrders?: string;
  currentPos?: string;
  message?: string;
};

export function buildDemoWhatsAppUrl(details: DemoLeadDetails): string {
  const lines = [
    "Namaste! I would like to request a NamasQr demo.",
    "",
    `Name: ${details.fullName}`,
    `Email: ${details.workEmail}`,
    `Phone: ${details.phone}`,
    `Hotel / company: ${details.companyName}`,
    `Role: ${details.role}`,
    `Go-live timeline: ${details.timeline}`,
  ];

  if (details.city?.trim()) lines.push(`City: ${details.city.trim()}`);
  if (details.country?.trim()) lines.push(`Country: ${details.country.trim()}`);
  if (details.monthlyOrders?.trim()) {
    lines.push(`Monthly order volume: ${details.monthlyOrders.trim()}`);
  }
  if (details.currentPos?.trim()) lines.push(`Current POS: ${details.currentPos.trim()}`);
  if (details.message?.trim()) {
    lines.push("", `Goals: ${details.message.trim()}`);
  }

  const text = lines.join("\n");
  return `https://wa.me/${SALES_WHATSAPP_E164}?text=${encodeURIComponent(text)}`;
}

export function salesWhatsAppChatUrl(prefill?: string): string {
  const base = `https://wa.me/${SALES_WHATSAPP_E164}`;
  if (!prefill?.trim()) return base;
  return `${base}?text=${encodeURIComponent(prefill.trim())}`;
}
