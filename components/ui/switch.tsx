"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        /* Off = red track, thumb left | On = green track, thumb right */
        "data-[checked]:!bg-emerald-500 data-[unchecked]:!bg-red-500 dark:data-[unchecked]:!bg-red-600",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-out",
          "group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3",
          /* Unchecked: start left */
          "translate-x-0.5",
          /* Checked: slide right (track width − thumb − padding) */
          "group-data-[checked]/switch:translate-x-[12px]",
          "group-data-[size=sm]/switch:group-data-[checked]/switch:translate-x-[8px]",
          "dark:bg-white dark:group-data-[unchecked]/switch:bg-white/95",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
