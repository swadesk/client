"use client";

import * as React from "react";
import { UtensilsCrossed } from "lucide-react";
import { menuPhotoChain } from "@/lib/dish-photos";
import { MENU_IMAGE_FALLBACK } from "@/lib/menu-images";
import { resolveMediaUrl } from "@/lib/media-url";
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
 * Known dishes also have a copy under `/dishes` so they still show when the
 * API host's upload disk is empty.
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
  const remote = resolveMediaUrl(src);
  const chain = React.useMemo(() => {
    const photos = menuPhotoChain({ remote, name: alt });
    if (photos.length === 0) return photos;
    return photos.includes(MENU_IMAGE_FALLBACK) ? photos : [...photos, MENU_IMAGE_FALLBACK];
  }, [remote, alt]);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    setStep(0);
  }, [chain]);

  if (chain.length === 0) {
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

  const effective = chain[Math.min(step, chain.length - 1)];

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={effective}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
        sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
        onError={() => setStep((current) => (current + 1 < chain.length ? current + 1 : current))}
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
      onError={() => setStep((current) => (current + 1 < chain.length ? current + 1 : current))}
    />
  );
}
