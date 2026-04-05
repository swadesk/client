"use client";

import * as React from "react";
import { UtensilsCrossed } from "lucide-react";
import { MENU_IMAGE_FALLBACK } from "@/lib/menu-images";
import { cn } from "@/lib/utils";

type MenuItemImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
};

/**
 * Menu photo with fallback when URL is missing or fails to load.
 * Uses native <img> to bypass next/image host restrictions for API uploads.
 */
export function MenuItemImage({
  src,
  alt,
  className,
  width = 800,
  height = 450,
  fill,
  sizes,
}: MenuItemImageProps) {
  const [failed, setFailed] = React.useState(false);

  if (!src) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted text-muted-foreground",
          fill ? "absolute inset-0" : className,
        )}
      >
        <UtensilsCrossed className={cn("opacity-40", fill ? "size-6" : "size-8")} aria-hidden />
      </div>
    );
  }

  const effective = failed ? MENU_IMAGE_FALLBACK : src;

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={effective}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
        sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={effective}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
