export type GlobalRole = "SuperAdmin" | "Staff";

export type RestaurantApprovalStatus = "PendingApproval" | "Active" | "Rejected";

/** Staff role in JWT and JSON responses (Title Case). */
export type StaffRoleApi = "Admin" | "Manager" | "Waiter" | "Kitchen";

/** Prisma-style enum for request bodies (join, members). */
export type StaffRoleBody = "ADMIN" | "MANAGER" | "WAITER" | "KITCHEN";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  globalRole: GlobalRole;
  restaurantId: string | null;
  role: StaffRoleApi | null;
  requiresOnboarding: boolean;
  restaurantApprovalStatus: RestaurantApprovalStatus | null;
  requiresApproval: boolean;
  canAccessDashboard: boolean;
};

export type AuthLoginRequest = {
  email: string;
  password: string;
};

export type AuthLoginResponse = {
  token: string;
  user: AuthUser;
};

export type AuthRegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type AuthRegisterResponse = AuthLoginResponse;

export type AuthRefreshRequest = {
  refreshToken: string;
};

export type AuthRefreshResponse = {
  token: string;
};

export type AuthMeResponse = {
  user: AuthUser;
};

export type BootstrapRestaurantRequest = {
  name: string;
  legalName?: string;
  address?: string;
  gstin?: string;
  phone?: string;
  description?: string;
};

/** POST /api/auth/forgot-password */
export type AuthForgotPasswordRequest = {
  email: string;
};

/** Backend returns a generic message (no email enumeration). */
export type AuthForgotPasswordResponse = {
  message: string;
};

/** POST /api/auth/reset-password — password min 8 chars; errorCode INVALID_RESET_TOKEN when invalid/expired. */
export type AuthResetPasswordRequest = {
  token: string;
  password: string;
};

export type AuthResetPasswordResponse = {
  ok?: boolean;
  message?: string;
};

export type JoinRestaurantRequest = {
  restaurantId: string;
  joinCode?: string;
  role?: StaffRoleBody;
};

/** POST body for /api/restaurants/:id/members — omit photoUrl unless it is a real https URL */
export type CreateMemberBody = {
  email: string;
  name: string;
  role: Exclude<StaffRoleBody, "ADMIN">;
  photoUrl?: string;
};

export type CreateMemberResponse = {
  email: string;
  restaurantId: string;
  role: Exclude<StaffRoleBody, "ADMIN">;
  emailSent: boolean;
  temporaryPassword?: string;
};

export type SuperAdminMemberRow = {
  userId: string;
  email: string;
  name: string;
  photoUrl: string | null;
  role: StaffRoleApi;
};

/** GET /api/restaurants/:id/members — same row shape as super-admin member list */
export type RestaurantMemberRow = SuperAdminMemberRow;

export type SuperAdminUsersQuery = {
  limit?: number;
  offset?: number;
  globalRole?: "SUPER_ADMIN" | "STAFF";
};

export type SuperAdminUserListItem = {
  id: string;
  email: string;
  name: string;
  photoUrl: string | null;
  globalRole: GlobalRole;
  createdAt: string;
  updatedAt: string;
  memberships: Array<{
    restaurantId: string;
    restaurantName: string;
    approvalStatus: RestaurantApprovalStatus;
    role: StaffRoleApi;
  }>;
};

export type SuperAdminUsersResponse = {
  users: SuperAdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
};
