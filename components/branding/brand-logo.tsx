import { useId } from "react";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Approximate rendered height (width scales). */
  height?: number;
  /** Header and footer mark, without the tagline that clips at small sizes. */
  compact?: boolean;
};

/** Inline wordmark so “Namas” follows the surrounding text color in light and dark themes. */
export function BrandLogo({ className, height = 40, compact = false }: BrandLogoProps) {
  const gradientId = `namasqr-mark-${useId().replace(/:/g, "")}`;
  const width = Math.round(height * (compact ? 3.15 : 3.6));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={compact ? "0 0 320 88" : "0 0 360 100"}
      width={width}
      height={height}
      role="img"
      aria-label="NamasQr"
      className={cn("block h-auto max-w-[min(100%,260px)] text-foreground", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="76" height="76" rx="14" fill={`url(#${gradientId})`} opacity="0.95" />
      <g fill="#fff" opacity="0.95">
        <rect x="22" y="26" width="10" height="10" rx="2" />
        <rect x="38" y="26" width="10" height="10" rx="2" />
        <rect x="60" y="26" width="10" height="10" rx="2" />
        <rect x="22" y="42" width="10" height="10" rx="2" />
        <rect x="52" y="42" width="10" height="10" rx="2" />
        <rect x="22" y="58" width="10" height="10" rx="2" />
        <rect x="38" y="58" width="10" height="10" rx="2" />
        <rect x="60" y="58" width="10" height="10" rx="2" />
      </g>
      <path d="M40 48c4-8 14-8 18 0 4 8-2 14-9 18-7-4-13-10-9-18z" fill="#1e3a8a" opacity="0.35" />
      <text
        x="100"
        y="58"
        fill="currentColor"
        fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
        fontSize="34"
        fontWeight="700"
      >
        Namas
      </text>
      <text
        x="214"
        y="58"
        fill="#ea580c"
        fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
        fontSize="34"
        fontWeight="700"
      >
        Qr
      </text>
      {compact ? null : (
        <text
          x="100"
          y="82"
          fill="currentColor"
          opacity="0.55"
          fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
          fontSize="10"
          fontWeight="600"
          letterSpacing="1.6"
        >
          TRADITION MEETS TECHNOLOGY
        </text>
      )}
    </svg>
  );
}
