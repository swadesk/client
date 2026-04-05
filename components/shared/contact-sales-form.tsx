"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ApiError } from "@/lib/api";
import { api } from "@/lib/api";

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

type ContactSalesRequestPayload = {
  fullName: string;
  workEmail: string;
  phone: string;
  companyName: string;
  role: string;
  timeline: string;
  city?: string;
  country?: string;
  monthlyOrders?: number;
  currentPos?: string;
  message?: string;
  leadSource?: string;
  submittedAt?: string;
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

function isIsoDateString(value: string): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString() === value;
}

function validateForm(values: ContactSalesFormValues): string | null {
  const required: Array<keyof Pick<ContactSalesFormValues, "fullName" | "workEmail" | "phone" | "companyName" | "role" | "timeline">> = [
    "fullName",
    "workEmail",
    "phone",
    "companyName",
    "role",
    "timeline",
  ];

  for (const field of required) {
    if (!values[field].trim()) return `${field} is required`;
  }

  if (!EMAIL_REGEX.test(values.workEmail.trim())) return "workEmail must be a valid email";

  const monthlyOrders = values.monthlyOrders.trim();
  if (monthlyOrders) {
    const parsed = Number(monthlyOrders);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return "monthlyOrders must be an integer greater than or equal to 0";
    }
  }

  return null;
}

function buildPayload(values: ContactSalesFormValues): ContactSalesRequestPayload {
  const submittedAt = new Date().toISOString();
  if (!isIsoDateString(submittedAt)) {
    throw new Error("submittedAt must be a valid ISO date string");
  }

  const payload: ContactSalesRequestPayload = {
    fullName: values.fullName.trim(),
    workEmail: values.workEmail.trim(),
    phone: values.phone.trim(),
    companyName: values.companyName.trim(),
    role: values.role.trim(),
    timeline: values.timeline.trim(),
    leadSource: "landing-page",
    submittedAt,
  };

  const city = values.city.trim();
  const country = values.country.trim();
  const currentPos = values.currentPos.trim();
  const message = values.message.trim();
  const monthlyOrders = values.monthlyOrders.trim();

  if (city) payload.city = city;
  if (country) payload.country = country;
  if (currentPos) payload.currentPos = currentPos;
  if (message) payload.message = message;
  if (monthlyOrders) payload.monthlyOrders = Number(monthlyOrders);

  return payload;
}

export function ContactSalesForm() {
  const [form, setForm] = useState<ContactSalesFormValues>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const validationError = validateForm(form);
    if (validationError) {
      setFeedback({
        type: "error",
        message: validationError,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload(form);
      await api.public.contactSales(payload);

      setFeedback({
        type: "ok",
        message: "Enquiry submitted",
      });
      setForm(INITIAL_STATE);
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as ApiError).message === "string"
          ? (error as ApiError).message
          : "Unable to submit form right now. Please try again.";

      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function setField<K extends keyof ContactSalesFormValues>(key: K, value: ContactSalesFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-lg shadow-primary/5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Full name <span className="text-primary">*</span>
          </label>
          <Input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Work email <span className="text-primary">*</span>
          </label>
          <Input
            type="email"
            value={form.workEmail}
            onChange={(e) => setField("workEmail", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Phone number <span className="text-primary">*</span>
          </label>
          <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Company name <span className="text-primary">*</span>
          </label>
          <Input value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Role <span className="text-primary">*</span>
          </label>
          <Input value={form.role} onChange={(e) => setField("role", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">City</label>
          <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Country</label>
          <Input value={form.country} onChange={(e) => setField("country", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Monthly order volume</label>
        <Input
          type="number"
          min={0}
          step={1}
          value={form.monthlyOrders}
          onChange={(e) => setField("monthlyOrders", e.target.value)}
          placeholder="e.g. 12000"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Current POS/stack</label>
          <Input
            value={form.currentPos}
            onChange={(e) => setField("currentPos", e.target.value)}
            placeholder="e.g. Petpooja, manual, custom POS"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Expected go-live timeline <span className="text-primary">*</span>
          </label>
          <Input
            value={form.timeline}
            onChange={(e) => setField("timeline", e.target.value)}
            placeholder="e.g. Within 30 days"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">What are you trying to improve?</label>
        <Textarea
          value={form.message}
          onChange={(e) => setField("message", e.target.value)}
          placeholder="Share key goals, pain points, and any integration needs."
        />
      </div>

      {feedback ? (
        <p className={feedback.type === "ok" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
          {feedback.message}
        </p>
      ) : null}

      <Button type="submit" className="h-10 px-5" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Request a demo"}
      </Button>
    </form>
  );
}
