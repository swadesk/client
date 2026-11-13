"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How long does onboarding take?",
    answer: "Most teams are live in under a week, including menu setup and staff onboarding.",
  },
  {
    question: "Can we run more than one outlet?",
    answer: "Yes. NamasQr supports centralized controls with outlet-level visibility for menus, orders, and reporting.",
  },
  {
    question: "Does it cover dine-in and takeaway?",
    answer: "Yes. Mixed service models stay on the same order, kitchen, and billing workflow.",
  },
  {
    question: "Do managers get live performance data?",
    answer: "Sales, order flow, and key service metrics are available from one dashboard during the shift.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="mt-10 divide-y divide-border border-y border-border">
      {faqs.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? -1 : index)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {item.question}
              <ChevronDown
                className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
                aria-hidden
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden" hidden={!expanded}>
                <p className="max-w-3xl pb-5 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
