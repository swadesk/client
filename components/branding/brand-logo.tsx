import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Approximate rendered height (width scales). */
  height?: number;
};

/** Logo source: `public/branding/namasqr-logo.svg` */
export function BrandLogo({ className, height = 40 }: BrandLogoProps) {
  return (
    <Image
      src="/branding/namasqr-logo.svg"
      alt="NamasQr"
      width={280}
      height={78}
      unoptimized
      className={cn("block h-auto w-auto max-w-[min(100%,260px)] object-contain object-center", className)}
      style={{ height, width: "auto" }}
      priority
    />
  );
}
