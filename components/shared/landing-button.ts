import { cn } from "@/lib/utils";

type LandingButtonVariant = "default" | "outline";
type LandingButtonSize = "sm" | "lg";

export function landingButtonClassName({
  variant = "default",
  size = "sm",
}: {
  variant?: LandingButtonVariant;
  size?: LandingButtonSize;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60",
    size === "lg" ? "h-11 px-5" : "h-9 px-3.5",
    variant === "outline"
      ? "border border-border bg-background text-foreground hover:bg-muted"
      : "bg-primary text-primary-foreground hover:bg-primary/90"
  );
}
