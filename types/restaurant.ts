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
  description?: string;
  approvalStatus: RestaurantApprovalStatus;
};
