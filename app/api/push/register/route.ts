import { NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@/lib/api-origin";

/**
 * Proxies Web Push subscription JSON to your API so the server can send alerts while the PWA is closed/backgrounded.
 *
 * Configure either:
 * - `PUSH_SUBSCRIBE_UPSTREAM` — full URL (e.g. https://api.example.com/api/device/web-push)
 * - or `NEXT_PUBLIC_API_ORIGIN` — defaults to `{origin}/api/device/web-push`
 *
 * Backend should persist `subscription` (endpoint + keys) per user/device and send Web Push with your VAPID **private** key.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("subscription" in body)) {
    return NextResponse.json(
      { ok: false, message: "Expected { subscription, restaurantId? }" },
      { status: 400 },
    );
  }

  const explicit = process.env.PUSH_SUBSCRIBE_UPSTREAM?.trim();
  const origin = getApiOrigin();
  const upstream =
    explicit || (origin ? `${origin}/api/device/web-push` : "");

  if (!upstream) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Push relay not configured. Set PUSH_SUBSCRIBE_UPSTREAM or NEXT_PUBLIC_API_ORIGIN so subscriptions can be saved.",
      },
      { status: 501 },
    );
  }

  const auth = req.headers.get("authorization");
  try {
    const res = await fetch(upstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const ct = res.headers.get("content-type") ?? "application/json; charset=utf-8";
    return new NextResponse(text, { status: res.status,  headers: { "Content-Type": ct } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream request failed";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
