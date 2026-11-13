"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildDemoWhatsAppUrl } from "@/lib/sales-contact";
import { cn } from "@/lib/utils";

type ContactSalesFormValues = {
  fullName: string;
  workEmail: string;
  phone: string;
  companyName: string;
  role: string;
  timeline: string;
  city: string;
  country: string;
  monthlyOrders: string;
  currentPos: string;
  message: string;
};

const INITIAL_STATE: ContactSalesFormValues = {
  fullName: "",
  workEmail: "",
  phone: "",
  companyName: "",
  role: "",
  timeline: "",
  city: "",
  country: "India",
  monthlyOrders: "",
  currentPos: "",
  message: "",
};

const EMAIL_REGEX = /\S+@\S+\.\S+/;

function validateForm(values: ContactSalesFormValues): string | null {
  const required: Array<
    keyof Pick<
      ContactSalesFormValues,
      "fullName" | "workEmail" | "phone" | "companyName" | "role" | "timeline"
    >
  > = ["fullName", "workEmail", "phone", "companyName", "role", "timeline"];

  for (const field of required) {
    if (!values[field].trim()) return `${field} is required`;
  }

  if (!EMAIL_REGEX.test(values.workEmail.trim())) return "Please enter a valid work email";

  const monthlyOrders = values.monthlyOrders.trim();
  if (monthlyOrders) {
    const parsed = Number(monthlyOrders);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return "Monthly order volume must be a whole number ≥ 0";
    }
  }

  return null;
}

export function ContactSalesForm({ className }: { className?: string }) {
  const [form, setForm] = useState<ContactSalesFormValues>(INITIAL_STATE);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const validationError = validateForm(form);
    if (validationError) {
      setFeedback({ type: "error", message: validationError });
      return;
    }

    const url = buildDemoWhatsAppUrl({
      fullName: form.fullName.trim(),
      workEmail: form.workEmail.trim(),
      phone: form.phone.trim(),
      companyName: form.companyName.trim(),
      role: form.role.trim(),
      timeline: form.timeline.trim(),
      city: form.city.trim() || undefined,
      country: form.country.trim() || undefined,
      monthlyOrders: form.monthlyOrders.trim() || undefined,
      currentPos: form.currentPos.trim() || undefined,
      message: form.message.trim() || undefined,
    });

    window.open(url, "_blank", "noopener,noreferrer");
    setFeedback({
      type: "ok",
      message: "Opening WhatsApp with your demo request…",
    });
    setForm(INITIAL_STATE);
  }

  function setField<K extends keyof ContactSalesFormValues>(
    key: K,
    value: ContactSalesFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_-32px_hsl(222_47%_11%/0.28)] sm:p-6",
        className,
      )}
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Full name <span className="text-primary">*</span>
          </label>
          <Input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Work email <span className="text-primary">*</span>
          </label>
          <Input
            type="email"
            value={form.workEmail}
            onChange={(e) => setField("workEmail", e.target.value)}
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Phone number <span className="text-primary">*</span>
          </label>
          <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Hotel / company <span className="text-primary">*</span>
          </label>
          <Input
            value={form.companyName}
            onChange={(e) => setField("companyName", e.target.value)}
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Role <span className="text-primary">*</span>
          </label>
          <Input value={form.role} onChange={(e) => setField("role", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">City</label>
          <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Country</label>
          <Input value={form.country} onChange={(e) => setField("country", e.target.value)} />
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Monthly order volume
          </label>
          <Input
            type="number"
            min={0}
            step={1}
            value={form.monthlyOrders}
            onChange={(e) => setField("monthlyOrders", e.target.value)}
            placeholder="e.g. 12000"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Expected go-live <span className="text-primary">*</span>
          </label>
          <Input
            value={form.timeline}
            onChange={(e) => setField("timeline", e.target.value)}
            placeholder="e.g. Within 30 days"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Current POS / stack</label>
        <Input
          value={form.currentPos}
          onChange={(e) => setField("currentPos", e.target.value)}
          placeholder="e.g. Petpooja, manual, custom POS"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          What are you trying to improve?
        </label>
        <Textarea
          value={form.message}
          onChange={(e) => setField("message", e.target.value)}
          placeholder="Share peak-hour pain points, room-service goals, or integration needs."
        />
      </div>

      {feedback ? (
        <p
          className={
            feedback.type === "ok" ? "text-sm text-emerald-600" : "text-sm text-destructive"
          }
        >
          {feedback.message}
        </p>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full gap-2 bg-[#25D366] text-white hover:bg-[#1ebe5a] sm:w-auto sm:px-6"
      >
        <MessageCircle className="size-4" />
        Send on WhatsApp
      </Button>
    </form>
  );
}
