export type CouponType = "percent" | "fixed";

export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number; // percent (e.g. 10) or fixed amount in paise
  minOrderCents?: number;
  maxDiscountCents?: number;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  usageCount?: number;
};
