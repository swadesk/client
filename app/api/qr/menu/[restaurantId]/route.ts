import { NextResponse } from "next/server";

function getOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_ORIGIN ?? process.env.API_ORIGIN;
  if (!raw?.trim()) return undefined;
  return raw.trim().replace(/\/$/, "");
}

/**
 * Guest QR menu: tries NamasQR public menu, then optional admin proxy with MENU_PROXY_BEARER_TOKEN.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await context.params;
  const origin = getOrigin();
  if (!origin) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_API_ORIGIN is not configured" },
      { status: 503 },
    );
  }

  const q = `restaurantId=${encodeURIComponent(restaurantId)}`;
  const publicUrl = `${origin}/api/public/menu?${q}`;

  let res = await fetch(publicUrl, { cache: "no-store" });
  if (res.ok) {
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  }

  const token = process.env.MENU_PROXY_BEARER_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        message:
          "Menu unavailable: add GET /api/public/menu on NamasQR or set MENU_PROXY_BEARER_TOKEN for server-side admin menu proxy.",
      },
      { status: 502 },
    );
  }

  const adminUrl = `${origin}/api/admin/menu?${q}`;
  res = await fetch(adminUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
