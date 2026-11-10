"use client";

import * as React from "react";
import { BrandLogo } from "@/components/branding/brand-logo";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type VenueBrandingLogoProps = {
  /** Uploaded venue logo URL (e.g. from `/uploads/...`); falls back to product brand when missing or invalid. */
  logoUrl?: string | null;
  className?: string;
  /** Approximate rendered height (width scales). */
  height?: number;
  alt?: string;
};

/**
 * Shows the venue’s uploaded logo when present; otherwise the NamasQr brand mark.
 * If the URL fails to load, falls back to the brand logo.
 */
export function VenueBrandingLogo({
  logoUrl,
  className,
  height = 40,
  alt = "Venue logo",
}: VenueBrandingLogoProps) {
  const [failed, setFailed] = React.useState(false);
  const resolved = resolveMediaUrl(logoUrl);

  React.useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) {
    return <BrandLogo height={height} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- user-provided URLs from API/uploads; avoids remotePatterns drift
    <img
      src={resolved}
      alt={alt}
      className={cn(
        "block h-auto w-auto max-w-[min(100%,260px)] object-contain object-center",
        className,
      )}
      style={{ height, width: "auto" }}
      onError={() => setFailed(true)}
    />
  );
}

type VenueLogoMarkProps = {
  logoUrl?: string | null;
  size?: number;
  className?: string;
  alt?: string;
};

/** Compact square-ish mark for dropdowns and chips (venue logo or monogram-style fallback). */
export function VenueLogoMark({
  logoUrl,
  size = 32,
  className,
  alt = "Venue",
}: VenueLogoMarkProps) {
  const [failed, setFailed] = React.useState(false);
  const resolved = resolveMediaUrl(logoUrl);

  React.useEffect(() => {
    setFailed(false);
  }, [resolved]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={!resolved || failed ? "/branding/namasqr-logo.svg" : resolved}
      alt={!resolved || failed ? "" : alt}
      className={cn("block shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      aria-hidden={!resolved || failed}
      onError={() => setFailed(true)}
    />
  );
}
