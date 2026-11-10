/**
 * Align with server `PAYMENT_POLICY` — hotel rollout is post-paid only.
 */
export const PAYMENT_POLICY = {
  postPaidOnly: true,
  allowStaffUpi: false,
} as const;
