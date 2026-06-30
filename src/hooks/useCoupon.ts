// src/hooks/useCoupon.ts
import { useState, useCallback } from "react";
import { supabase } from "../AppContext";

export interface CouponValidationResult {
  valid: boolean;
  discount: number;        // total discount amount in currency
  message?: string;
  coupon?: any;
}

export const useCoupon = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate and apply coupon to a cart total.
   * @param code - coupon code (case-insensitive)
   * @param subtotal - current cart subtotal (before discount)
   * @returns CouponValidationResult
   */
  const validateCoupon = useCallback(async (
    code: string,
    subtotal: number
  ): Promise<CouponValidationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch coupon
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .ilike("code", code.trim())
        .maybeSingle();

      if (error) throw error;
      if (!coupon) {
        return { valid: false, discount: 0, message: "Invalid coupon code" };
      }

      // 2. Check active status
      if (!coupon.is_active) {
        return { valid: false, discount: 0, message: "This coupon is no longer active" };
      }

      // 3. Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { valid: false, discount: 0, message: "This coupon has expired" };
      }

      // 4. Check usage limit
      if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
        return { valid: false, discount: 0, message: "This coupon has reached its usage limit" };
      }

      // 5. Check minimum order
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        return {
          valid: false,
          discount: 0,
          message: `Minimum order of R${coupon.min_order_amount} required`,
        };
      }

      // 6. Calculate discount
      let discount = 0;
      if (coupon.type === "percentage") {
        discount = (subtotal * coupon.value) / 100;
        if (coupon.max_discount && discount > coupon.max_discount) {
          discount = coupon.max_discount;
        }
      } else {
        discount = Math.min(coupon.value, subtotal); // cannot discount more than subtotal
      }

      // 7. Return success
      return {
        valid: true,
        discount,
        coupon,
        message: `Coupon applied: ${coupon.code}`,
      };
    } catch (err: any) {
      setError(err.message);
      return { valid: false, discount: 0, message: "Failed to validate coupon" };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Increment usage count after successful order.
   */
  const incrementUsage = useCallback(async (couponId: string) => {
    try {
      const { error } = await supabase.rpc("increment_coupon_usage", {
        coupon_id: couponId,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to increment coupon usage:", err);
      return false;
    }
  }, []);

  return { validateCoupon, incrementUsage, isLoading, error };
};