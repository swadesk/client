export const storyTable = "12";

export const storyItems = [
  { name: "Butter chicken", price: "₹420" },
  { name: "Garlic naan", price: "₹80" },
] as const;

export const storyTotal = "₹500";

export const serviceStory = [
  {
    id: "scan",
    who: "Guest",
    short: "Scan",
    title: "Guests scan the QR",
    detail: "The menu opens on their phone",
    line: "Any guest can scan. The menu opens on their phone. No app to download.",
  },
  {
    id: "kitchen",
    who: "Kitchen",
    short: "Kitchen",
    title: "The kitchen gets the order",
    detail: "The ticket shows up instantly",
    line: "The moment they send it, the kitchen has the ticket.",
  },
  {
    id: "floor",
    who: "You",
    short: "Tables",
    title: "You see every table",
    detail: "No need to ask anyone",
    line: "Ordering, eating, paying, or free. You can see it without asking.",
  },
  {
    id: "bill",
    who: "Bill",
    short: "Bill",
    title: "They pay, the table frees",
    detail: "The next guest can sit",
    line: "Payment closes the visit, and the table is free for the next guest.",
  },
] as const;
