import type { ComponentProps } from "react";

type IconProps = ComponentProps<"svg">;

function BaseIcon({ children, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="5" rx="1" />
      <rect x="13" y="10" width="8" height="11" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
    </BaseIcon>
  );
}

export function TablesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="6" width="16" height="10" rx="2" />
      <path d="M8 16v3M16 16v3" />
    </BaseIcon>
  );
}

export function RoomsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13" />
      <path d="M2 20h20" />
      <path d="M10 20v-6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6" />
      <path d="M8 9h.01M12 9h.01M16 9h.01" />
    </BaseIcon>
  );
}

export function FloorMapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </BaseIcon>
  );
}

export function MenuBookIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 0-4 4z" />
      <path d="M5 4v16" />
    </BaseIcon>
  );
}

export function OrdersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </BaseIcon>
  );
}

export function ShiftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

export function BillingIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M8 14h3M13 14h3" />
    </BaseIcon>
  );
}

export function KitchenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 3v7M11 3v7M14 3v7M17 3v7" />
      <path d="M7 10h10v11H7z" />
    </BaseIcon>
  );
}

export function WaitersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="7" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </BaseIcon>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </BaseIcon>
  );
}

export function InventoryIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 8l9-5 9 5-9 5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </BaseIcon>
  );
}

export function AnalyticsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20V10M10 20V6M16 20V13M22 20H2" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6z" />
    </BaseIcon>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M12 21v-4" />
    </BaseIcon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    </BaseIcon>
  );
}

export function QrIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v2M18 18h3M14 20h2" />
    </BaseIcon>
  );
}

export function MenuIconGlyph(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </BaseIcon>
  );
}
