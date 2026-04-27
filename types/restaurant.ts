import type { RestaurantApprovalStatus } from "@/types/auth";

export type { RestaurantApprovalStatus };

export type Restaurant = {
  id: string;
  name: string;
  legalName?: string;
  address?: string;
  gstin?: string;
  phone?: string;
  logoUrl?: string;
  /** Requested at onboarding; visible after super-admin approves the venue. */
  roomSections?: string | null;
  description?: string;
  approvalStatus: RestaurantApprovalStatus;
};
