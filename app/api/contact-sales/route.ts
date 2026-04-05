import { NextResponse } from "next/server";

type ContactSalesPayload = {
  fullName?: string;
  workEmail?: string;
  phone?: string;
  companyName?: string;
  role?: string;
  city?: string;
  country?: string;
  monthlyOrders?: string;
  currentPos?: string;
  timeline?: string;
  message?: string;
};

function getOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_ORIGIN ?? process.env.API_ORIGIN;
  if (!raw?.trim()) return process.env.NODE_ENV !== "production" ? "http://localhost:8000" : undefined;
  return raw.trim().replace(/\/$/, "");
}

function normalize(input: unknown): ContactSalesPayload {
  if (!input || typeof input !== "object") return {};
  const body = input as Record<string, unknown>;
  return {
    fullName: String(body.fullName ?? "").trim(),
    workEmail: String(body.workEmail ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    companyName: String(body.companyName ?? "").trim(),
    role: String(body.role ?? "").trim(),
    city: String(body.city ?? "").trim(),
    country: String(body.country ?? "").trim(),
    monthlyOrders: String(body.monthlyOrders ?? "").trim(),
    currentPos: String(body.currentPos ?? "").trim(),
    timeline: String(body.timeline ?? "").trim(),
    message: String(body.message ?? "").trim(),
  };
}

function validate(payload: ContactSalesPayload) {
  const required = ["fullName", "workEmail", "phone", "companyName", "role", "timeline"] as const;
  for (const key of required) {
    if (!payload[key]) return `${key} is required`;
  }
  if (!/\S+@\S+\.\S+/.test(payload.workEmail || "")) return "workEmail is invalid";
  return null;
}

export async function POST(request: Request) {
  const body = normalize(await request.json().catch(() => null));
  const issue = validate(body);
  if (issue) {
    return NextResponse.json({ message: issue }, { status: 400 });
  }

  const webhookUrl = process.env.CONTACT_SALES_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadSource: "landing-page",
        submittedAt: new Date().toISOString(),
        ...body,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ message: "Failed to submit to sales webhook" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: "Submitted" }, { status: 202 });
  }

  const origin = getOrigin();
  if (origin) {
    const response = await fetch(`${origin}/api/public/contact-sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadSource: "landing-page",
        submittedAt: new Date().toISOString(),
        ...body,
      }),
      cache: "no-store",
    });
    if (response.ok) {
      return NextResponse.json({ ok: true, message: "Submitted" }, { status: 202 });
    }

    const backendBody = (await response.json().catch(() => null)) as
      | { message?: string; success?: boolean; errorCode?: string }
      | null;
    return NextResponse.json(
      {
        message: backendBody?.message || "Contact sales submission failed on backend.",
        errorCode: backendBody?.errorCode,
      },
      { status: response.status || 502 },
    );
  }

  return NextResponse.json(
    {
      message:
        "Contact sales backend is not configured. Set CONTACT_SALES_WEBHOOK_URL or implement POST /api/public/contact-sales on your API.",
    },
    { status: 503 },
  );
}
