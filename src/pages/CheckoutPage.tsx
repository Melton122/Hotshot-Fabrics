import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import { useStoreSettings } from "../hooks/useStoreSettings";
import { useCoupon } from "../hooks/useCoupon"; //
import {
  ChevronLeft, MapPin, User, Truck, Package,
  Check, CreditCard, Loader2, Tag, Shield, Receipt, Printer,
  Download, Sparkles, CheckCircle2, Banknote,
  Building2, Star, Gift, Plus, ChevronDown, ChevronUp,
  AlertTriangle, X, Zap, MessageCircle
} from "lucide-react";

interface CheckoutPageProps {
  initialDiscount?: number;
  initialCoupon?: string;
}

type PaymentMethod = "cash_on_delivery" | "eft_bank_transfer";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string; icon: any; color: string; badge?: string }[] = [
  { id: "cash_on_delivery", label: "Cash on Delivery", desc: "Pay when your order arrives", icon: Banknote, color: "emerald" },
  { id: "eft_bank_transfer", label: "EFT / Bank Transfer", desc: "Direct bank transfer — we confirm manually", icon: Building2, color: "blue" },
];

export function CheckoutPage({ initialDiscount = 0, initialCoupon = "" }: CheckoutPageProps) {
  const { user, profile, setCurrentView, toast } = useApp();
  const { settings: storeSettings } = useStoreSettings();
  const { validateCoupon, incrementUsage, isLoading: isCouponLoading } = useCoupon(); // 👈 NEW HOOK

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [discount, setDiscount] = useState(initialDiscount);
  const [appliedCoupon, setAppliedCoupon] = useState(initialCoupon);
  const [couponInput, setCouponInput] = useState(initialCoupon);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [deliverySpeed, setDeliverySpeed] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [appliedCouponData, setAppliedCouponData] = useState<any>(null); // store full coupon data for usage increment
  const channelRef = useRef<any>(null);

  const loyaltyDiscount = useLoyaltyPoints ? Math.min((profile?.loyalty_points || 0) * 0.1, 500) : 0;

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "South Africa",
    notes: ""
  });

  const getProductImage = (product: any): string | null => {
    if (product?.image_url) return product.image_url;
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      if (typeof product.images[0] === "string") return product.images[0];
      if (product.images[0]?.image_url) return product.images[0].image_url;
    }
    return null;
  };

  const fetchCart = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`*, product:products!inner(id, name, slug, price, stock_quantity, is_active, sku, image_url, images), color:colors(id, name, hex_code), size:sizes(id, name)`)
        .eq("user_id", user.id);
      if (error) throw error;
      const validItems = (data || []).filter((item: any) => item.product?.is_active !== false);
      setCartItems(validItems);
    } catch {
      toast("Failed to load cart", "error");
    }
  }, [user, toast]);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      if (error) throw error;
      if (data) {
        setAddresses(data);
        const def = data.find((a: any) => a.is_default);
        if (def) setSelectedAddress(def.id);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    if (user) {
      Promise.all([fetchCart(), fetchAddresses()]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, fetchCart, fetchAddresses]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`checkout_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${user.id}` }, fetchCart)
      .subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [user, fetchCart]);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || prev.full_name,
        email: profile.email || prev.email,
        phone: profile.phone || prev.phone
      }));
    }
  }, [profile]);

  // ── UPDATED COUPON APPLICATION ──
  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    try {
      // Use the new validateCoupon from hook
      const result = await validateCoupon(couponInput, subtotal);
      if (result.valid) {
        setDiscount(result.discount);
        setAppliedCoupon(result.coupon.code);
        setAppliedCouponData(result.coupon);
        toast(result.message || "Coupon applied!", "success");
        // Close coupon input area
        setShowCoupon(false);
      } else {
        // Clear any previous coupon if validation fails
        setDiscount(0);
        setAppliedCoupon("");
        setAppliedCouponData(null);
        toast(result.message || "Invalid coupon", "error");
      }
    } catch (err: any) {
      toast(err.message || "Error applying coupon", "error");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setDiscount(0);
    setAppliedCoupon("");
    setAppliedCouponData(null);
    setCouponInput("");
    toast("Coupon removed", "info");
  };

  // ── VALIDATION ──
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.full_name.trim()) errors.full_name = "Required";
    if (!formData.email.trim()) errors.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email";
    if (!formData.phone.trim()) errors.phone = "Required";
    if (showNewAddress || addresses.length === 0) {
      if (!formData.address_line1.trim()) errors.address_line1 = "Required";
      if (!formData.city.trim()) errors.city = "Required";
      if (!formData.postal_code.trim()) errors.postal_code = "Required";
    } else if (!selectedAddress) {
      errors.address = "Please select a delivery address";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── COMPUTED VALUES ──
  const subtotal = cartItems.reduce((sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1), 0);
  const expressFee = deliverySpeed === "express" ? 150 : 0;
  const baseShipping = subtotal >= 1500 ? 0 : 80;
  const totalShipping = baseShipping + expressFee;
  const totalDiscount = discount + loyaltyDiscount;
  const total = Math.max(0, subtotal + totalShipping - totalDiscount);

  // ── ORDER SUBMISSION ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) { toast("Your cart is empty", "error"); return; }
    if (!validateForm()) { toast("Please fix the errors below", "error"); return; }

    setIsSubmitting(true);
    try {
      let shippingAddress: any;
      let addressId = null;

      if (selectedAddress && !showNewAddress && addresses.length > 0) {
        const addr = addresses.find(a => a.id === selectedAddress);
        if (!addr) throw new Error("Address not found");
        shippingAddress = {
          full_name: addr.full_name, phone: addr.phone,
          address_line1: addr.address_line1, address_line2: addr.address_line2 || "",
          city: addr.city, state: addr.state || "", postal_code: addr.postal_code,
          country: addr.country || "South Africa"
        };
        addressId = addr.id;
      } else {
        shippingAddress = {
          full_name: formData.full_name, phone: formData.phone,
          address_line1: formData.address_line1, address_line2: formData.address_line2 || "",
          city: formData.city, state: formData.state || "", postal_code: formData.postal_code,
          country: formData.country || "South Africa"
        };
        if (saveNewAddress && user) {
          try {
            const { data: newAddr } = await supabase.from("user_addresses")
              .insert({
                user_id: user.id, label: "Home", full_name: formData.full_name, phone: formData.phone,
                address_line1: formData.address_line1, address_line2: formData.address_line2 || "",
                city: formData.city, state: formData.state || "", postal_code: formData.postal_code,
                country: formData.country || "South Africa", is_default: addresses.length === 0
              }).select().single();
            if (newAddr) addressId = newAddr.id;
          } catch {}
        }
      }

      const orderData: any = {
        user_id: user!.id,
        status: "pending",
        payment_status: paymentMethod === "eft_bank_transfer" ? "awaiting_proof" : "pending",
        payment_method: paymentMethod,
        subtotal,
        shipping_cost: totalShipping,
        discount_amount: totalDiscount,
        discount_applied: totalDiscount,
        total,
        shipping_address: shippingAddress,
        notes: formData.notes,
        coupon_code: appliedCoupon || null,
        delivery_speed: deliverySpeed,
        whatsapp_number: storeSettings.whatsapp_number,
      };
      if (addressId) orderData.address_id = addressId;

      const { data: order, error: orderError } = await supabase.from("orders").insert(orderData).select().single();
      if (orderError) throw new Error(orderError.message);

      const orderItemsData = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product?.name || "Unknown Product",
        product_sku: item.product?.sku || null,
        product_image: getProductImage(item.product) || null,
        color_name: item.color?.name || null,
        size_name: item.size?.name || null,
        unit_price: item.product?.price || 0,
        quantity: item.quantity || 1,
        total_price: (item.product?.price || 0) * (item.quantity || 1)
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);
      if (itemsError) toast("Order created but some items may be missing", "warning");

      try {
        await supabase.from("order_tracking").insert({
          order_id: order.id, status: "pending",
          description: "Order placed successfully. Awaiting confirmation.",
          is_customer_visible: true
        });
      } catch {}

      // Award loyalty points (1 point per R10 spent)
      if (user && total > 0) {
        const pointsEarned = Math.floor(total / 10);
        try {
          await supabase.from("user_profiles")
            .update({ loyalty_points: (profile?.loyalty_points || 0) + pointsEarned - (useLoyaltyPoints ? Math.floor(loyaltyDiscount / 0.1) : 0) })
            .eq("id", user.id);
        } catch {}
      }

      // 👇 USE NEW incrementUsage HOOK
      if (appliedCouponData) {
        try {
          await incrementUsage(appliedCouponData.id);
        } catch (err) {
          console.error("Failed to increment coupon usage", err);
        }
      }

      await supabase.from("cart_items").delete().eq("user_id", user!.id);

      // WhatsApp notification to admin
      const itemsList = cartItems.map(item =>
        `• ${item.product?.name} (x${item.quantity}) — R${((item.product?.price || 0) * (item.quantity || 1)).toFixed(2)}`
      ).join("\n");
      const eftNote = paymentMethod === "eft_bank_transfer" ? "\n⚠️ *Awaiting Proof of Payment* — please confirm once received." : "";
      const adminWaNumber = storeSettings.whatsapp_number.replace(/\D/g, "");
      const adminWaIntl = adminWaNumber.startsWith("0") ? `27${adminWaNumber.slice(1)}` : adminWaNumber;
      const waMsg = `*New Order — ${order.order_number}*\n\n*Customer:* ${formData.full_name}\n*Phone:* ${formData.phone}\n*Payment:* ${paymentMethod.replace(/_/g, " ")}${eftNote}\n\n*Items:*\n${itemsList}\n\n*Total:* R${total.toFixed(2)}\n*Address:* ${shippingAddress.address_line1}, ${shippingAddress.city}\n${formData.notes ? `*Notes:* ${formData.notes}` : ""}`;
      window.open(`https://wa.me/${adminWaIntl}?text=${encodeURIComponent(waMsg)}`, "_blank");

      setPlacedOrder({ ...order, items: orderItemsData, pointsEarned: Math.floor(total / 10) });
      setOrderSuccess(true);
      toast("Order placed successfully!", "success");

      setTimeout(() => setCurrentView("order-detail", { orderId: order.id }), 4000);
    } catch (err: any) {
      toast(err.message || "Error placing order. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── RECEIPT GENERATION (unchanged) ──
  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(generateReceipt());
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const handleDownload = () => {
    const blob = new Blob([generateReceipt()], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Receipt-${placedOrder?.order_number || "order"}.html`;
    a.click();
    toast("Receipt downloaded", "success");
  };

  const generateReceipt = () => {
    if (!placedOrder) return "";
    const addr = placedOrder.shipping_address || {};
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${placedOrder.order_number}</title>
<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;max-width:620px;margin:0 auto;color:#111}
.header{background:#f97316;color:white;padding:28px 32px;border-radius:14px;margin-bottom:24px}
.header h1{margin:0;font-size:24px}.header p{margin:4px 0 0;opacity:.8;font-size:13px}
.badge{display:inline-block;background:white;color:#f97316;padding:4px 12px;border-radius:100px;font-size:11px;font-weight:700;margin-top:8px}
.section{margin-bottom:20px;padding:16px 20px;border:1px solid #e5e7eb;border-radius:10px}
.section h3{margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}
.row{display:flex;justify-content:space-between;padding:5px 0;font-size:14px;border-bottom:1px solid #f3f4f6}
.row:last-child{border:none}.label{color:#6b7280}.total-row{font-size:18px;font-weight:700;padding-top:12px;border-top:2px solid #111;color:#f97316}
.footer{text-align:center;margin-top:32px;color:#9ca3af;font-size:12px}
@media print{body{padding:0}}</style></head><body>
<div class="header"><h1>Hotshot Fabrics</h1><p>Order Receipt — ${new Date().toLocaleDateString("en-ZA")}</p><span class="badge">${placedOrder.order_number}</span></div>
<div class="section"><h3>Delivery Address</h3><div class="row"><span class="label">Name</span><span>${addr.full_name || "N/A"}</span></div><div class="row"><span class="label">Address</span><span>${addr.address_line1}, ${addr.city} ${addr.postal_code}</span></div><div class="row"><span class="label">Phone</span><span>${addr.phone || "N/A"}</span></div></div>
<div class="section"><h3>Items</h3>${placedOrder.items.map((i: any) => `<div class="row"><span>${i.product_name} × ${i.quantity}</span><span>R${i.total_price.toFixed(2)}</span></div>`).join("")}</div>
<div class="section"><h3>Payment</h3><div class="row"><span class="label">Method</span><span>${paymentMethod.replace(/_/g, " ")}</span></div><div class="row"><span class="label">Subtotal</span><span>R${subtotal.toFixed(2)}</span></div><div class="row"><span class="label">Shipping</span><span>${totalShipping === 0 ? "Free" : `R${totalShipping}`}</span></div>${totalDiscount > 0 ? `<div class="row" style="color:#10b981"><span>Discount</span><span>-R${totalDiscount.toFixed(2)}</span></div>` : ""}<div class="row total-row"><span>Total</span><span>R${total.toFixed(2)}</span></div></div>
${placedOrder.pointsEarned ? `<div class="section" style="background:#fff7ed;border-color:#fed7aa"><h3 style="color:#ea580c">🎁 Points Earned</h3><p style="margin:0;color:#c2410c">You earned <strong>${placedOrder.pointsEarned} loyalty points</strong> on this order!</p></div>` : ""}
<div class="footer"><p><strong>Thank you for shopping with Hotshot Fabrics!</strong></p><p>WhatsApp: 083 416 0993 | hotshot@example.co.za</p></div>
</body></html>`;
  };

  // ── RENDER GUARDS (unchanged) ──
  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <User className="w-10 h-10 text-orange-400" />
          </div>
          <h2 className="text-2xl font-black mb-2">Sign in to Checkout</h2>
          <p className="text-zinc-400 mb-6">You need an account to place an order</p>
          <button onClick={() => setCurrentView("login")}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-all">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Package className="w-10 h-10 text-zinc-600" />
          </div>
          <h2 className="text-2xl font-black mb-2">Your cart is empty</h2>
          <button onClick={() => setCurrentView("shop")}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-all mt-4">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  // ── SUCCESS SCREEN (unchanged) ──
  if (orderSuccess && placedOrder) {
    return (
      <div className="min-h-screen pt-24 pb-20 bg-black">
        <div className="max-w-lg mx-auto px-4 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15 }}
            className="w-28 h-28 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-14 h-14 text-emerald-400" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-3xl font-black mb-1">Order Confirmed!</h2>
            <p className="text-zinc-400 mb-5">Thank you for shopping with Hotshot Fabrics</p>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl px-5 py-4 mb-4 inline-flex items-center gap-3">
              <Receipt className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-zinc-400">Order</span>
              <span className="font-mono font-bold text-orange-400 text-lg">{placedOrder.order_number}</span>
            </div>

            {placedOrder.pointsEarned > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-orange-400">+{placedOrder.pointsEarned} loyalty points earned!</p>
                  <p className="text-xs text-zinc-400">Keep shopping to unlock rewards</p>
                </div>
              </motion.div>
            )}

            {paymentMethod === "eft_bank_transfer" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mb-4 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-blue-400 text-sm">EFT Payment Details</span>
                </div>
                <div className="space-y-1 text-sm mb-4">
                  <p><span className="text-zinc-400">Bank:</span> <span className="font-medium">{storeSettings.bank_name}</span></p>
                  <p><span className="text-zinc-400">Account Name:</span> <span className="font-medium">{storeSettings.bank_account_name}</span></p>
                  <p><span className="text-zinc-400">Account:</span> <span className="font-mono font-bold">{storeSettings.bank_account}</span></p>
                  <p><span className="text-zinc-400">Branch:</span> <span className="font-medium">{storeSettings.bank_branch}</span></p>
                  <p><span className="text-zinc-400">Reference:</span> <span className="font-mono font-bold text-orange-400">{placedOrder.order_number}</span></p>
                  <p><span className="text-zinc-400">Amount:</span> <span className="font-bold">R{total.toFixed(2)}</span></p>
                </div>
                <button
                  onClick={() => {
                    const adminWaNumber = storeSettings.whatsapp_number.replace(/\D/g, "");
                    const adminWaIntl = adminWaNumber.startsWith("0") ? `27${adminWaNumber.slice(1)}` : adminWaNumber;
                    const popMsg = `*Proof of Payment — ${placedOrder.order_number}*\n\n*Customer:* ${formData.full_name}\n*Amount:* R${total.toFixed(2)}\n*Reference:* ${placedOrder.order_number}\n\nPlease find my proof of payment attached.`;
                    window.open(`https://wa.me/${adminWaIntl}?text=${encodeURIComponent(popMsg)}`, "_blank");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-sm text-white transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send Proof of Payment via WhatsApp
                </button>
              </motion.div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 text-left">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Order Summary</h3>
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors" title="Print">
                    <Printer className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button onClick={handleDownload} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors" title="Download">
                    <Download className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {placedOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-zinc-800 last:border-0">
                    <span className="text-zinc-300">{item.product_name} <span className="text-zinc-500">×{item.quantity}</span></span>
                    <span className="text-orange-400 font-medium">R{item.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t border-zinc-800">
                <span>Total</span>
                <span className="text-orange-400">R{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setCurrentView("shop")}
                className="py-3 border border-zinc-700 hover:border-zinc-500 rounded-xl font-bold text-sm transition-all">
                Keep Shopping
              </button>
              <button onClick={() => setCurrentView("orders")}
                className="py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-all">
                Track Order
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── MAIN CHECKOUT FORM (updated coupon UI) ──

  const InputField = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
    </div>
  );

  const inputClass = (err?: string) =>
    `w-full px-4 py-3 bg-black border rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-colors ${err ? "border-red-500" : "border-zinc-800 hover:border-zinc-700"}`;

  return (
    <div className="min-h-screen pt-24 pb-20 bg-black">
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => setCurrentView("cart")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Cart
        </button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black">Checkout</h1>
          <div className="flex items-center gap-1.5 text-sm text-zinc-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Secure Checkout</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-bold text-base flex items-center gap-2 mb-5">
                <User className="w-4 h-4 text-orange-400" /> Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Full Name" error={formErrors.full_name}>
                  <input type="text" value={formData.full_name}
                    onChange={e => { setFormData(p => ({ ...p, full_name: e.target.value })); setFormErrors(p => ({ ...p, full_name: "" })); }}
                    placeholder="Jane Doe" className={inputClass(formErrors.full_name)} />
                </InputField>
                <InputField label="Email" error={formErrors.email}>
                  <input type="email" value={formData.email}
                    onChange={e => { setFormData(p => ({ ...p, email: e.target.value })); setFormErrors(p => ({ ...p, email: "" })); }}
                    placeholder="jane@example.com" className={inputClass(formErrors.email)} />
                </InputField>
                <InputField label="Phone" error={formErrors.phone}>
                  <input type="tel" value={formData.phone}
                    onChange={e => { setFormData(p => ({ ...p, phone: e.target.value })); setFormErrors(p => ({ ...p, phone: "" })); }}
                    placeholder="+27 82 000 0000" className={inputClass(formErrors.phone)} />
                </InputField>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-bold text-base flex items-center gap-2 mb-5">
                <MapPin className="w-4 h-4 text-orange-400" /> Delivery Address
              </h2>

              {addresses.length > 0 && (
                <div className="space-y-2 mb-4">
                  {addresses.map(addr => (
                    <button key={addr.id} type="button"
                      onClick={() => { setSelectedAddress(addr.id); setShowNewAddress(false); }}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${selectedAddress === addr.id && !showNewAddress ? "border-orange-500 bg-orange-500/5" : "border-zinc-800 hover:border-zinc-700"}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{addr.full_name}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{addr.address_line1}, {addr.city}, {addr.postal_code}</p>
                          {addr.phone && <p className="text-xs text-zinc-500 mt-0.5">{addr.phone}</p>}
                        </div>
                        {addr.is_default && <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">Default</span>}
                      </div>
                    </button>
                  ))}
                  <button type="button" onClick={() => setShowNewAddress(v => !v)}
                    className={`w-full p-4 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all ${showNewAddress ? "border-orange-500 text-orange-400" : "border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
                    <Plus className="w-4 h-4" /> Add new address
                  </button>
                </div>
              )}

              <AnimatePresence>
                {(showNewAddress || addresses.length === 0) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Street Address" error={formErrors.address_line1}>
                      <input type="text" value={formData.address_line1} placeholder="123 Main Street"
                        onChange={e => setFormData(p => ({ ...p, address_line1: e.target.value }))}
                        className={inputClass(formErrors.address_line1)} />
                    </InputField>
                    <InputField label="Suburb / Unit (optional)">
                      <input type="text" value={formData.address_line2} placeholder="Apt 4B"
                        onChange={e => setFormData(p => ({ ...p, address_line2: e.target.value }))}
                        className={inputClass()} />
                    </InputField>
                    <InputField label="City" error={formErrors.city}>
                      <input type="text" value={formData.city} placeholder="Johannesburg"
                        onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                        className={inputClass(formErrors.city)} />
                    </InputField>
                    <InputField label="Postal Code" error={formErrors.postal_code}>
                      <input type="text" value={formData.postal_code} placeholder="2000"
                        onChange={e => setFormData(p => ({ ...p, postal_code: e.target.value }))}
                        className={inputClass(formErrors.postal_code)} />
                    </InputField>
                    {addresses.length > 0 && (
                      <div className="sm:col-span-2 flex items-center gap-3">
                        <button type="button" onClick={() => setSaveNewAddress(v => !v)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${saveNewAddress ? "bg-orange-500 border-orange-500" : "border-zinc-600"}`}>
                          {saveNewAddress && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <span className="text-sm text-zinc-400">Save this address for future orders</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Delivery Speed */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-bold text-base flex items-center gap-2 mb-5">
                <Truck className="w-4 h-4 text-orange-400" /> Delivery Speed
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "standard", label: "Standard", sub: "3–5 business days", price: subtotal >= 1500 ? "Free" : "R80", icon: Package },
                  { value: "express", label: "Express", sub: "1–2 business days", price: "R150", icon: Zap }
                ].map(opt => {
                  const Ic = opt.icon;
                  return (
                    <button key={opt.value} type="button" onClick={() => setDeliverySpeed(opt.value as any)}
                      className={`p-4 rounded-xl border text-left transition-all ${deliverySpeed === opt.value ? "border-orange-500 bg-orange-500/5" : "border-zinc-800 hover:border-zinc-700"}`}>
                      <Ic className={`w-5 h-5 mb-2 ${deliverySpeed === opt.value ? "text-orange-400" : "text-zinc-500"}`} />
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{opt.sub}</p>
                      <p className={`text-sm font-bold mt-1 ${deliverySpeed === opt.value ? "text-orange-400" : "text-zinc-300"}`}>{opt.price}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-bold text-base flex items-center gap-2 mb-5">
                <CreditCard className="w-4 h-4 text-orange-400" /> Payment Method
              </h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(pm => {
                  const Ic = pm.icon;
                  const colorMap: Record<string, string> = {
                    emerald: "border-emerald-500 bg-emerald-500/5",
                    blue: "border-blue-500 bg-blue-500/5",
                    orange: "border-orange-500 bg-orange-500/5",
                    purple: "border-purple-500 bg-purple-500/5",
                  };
                  const iconColorMap: Record<string, string> = {
                    emerald: "text-emerald-400 bg-emerald-500/10",
                    blue: "text-blue-400 bg-blue-500/10",
                    orange: "text-orange-400 bg-orange-500/10",
                    purple: "text-purple-400 bg-purple-500/10",
                  };
                  return (
                    <button key={pm.id} type="button" onClick={() => setPaymentMethod(pm.id)}
                      className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-all ${paymentMethod === pm.id ? colorMap[pm.color] : "border-zinc-800 hover:border-zinc-700"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColorMap[pm.color]}`}>
                        <Ic className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{pm.label}</p>
                          {pm.badge && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-bold">{pm.badge}</span>}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{pm.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${paymentMethod === pm.id ? `bg-${pm.color}-500 border-${pm.color}-500` : "border-zinc-600"}`}>
                        {paymentMethod === pm.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  );
                })}

                {/* Loyalty Points toggle */}
                {(profile?.loyalty_points || 0) >= 10 && (
                  <button type="button" onClick={() => setUseLoyaltyPoints(v => !v)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-all ${useLoyaltyPoints ? "border-amber-500 bg-amber-500/5" : "border-zinc-800 hover:border-zinc-700"}`}>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Star className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Use Loyalty Points</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {profile?.loyalty_points} pts available — save R{Math.min((profile?.loyalty_points || 0) * 0.1, 500).toFixed(2)}
                      </p>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-all relative ${useLoyaltyPoints ? "bg-amber-500" : "bg-zinc-700"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${useLoyaltyPoints ? "right-1" : "left-1"}`} />
                    </div>
                  </button>
                )}
              </div>

              {paymentMethod === "eft_bank_transfer" && (
                <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-sm">
                  <p className="font-semibold text-blue-400 mb-2">EFT Banking Details</p>
                  <div className="space-y-1 text-zinc-300">
                    <p>Bank: <span className="font-medium">{storeSettings.bank_name}</span></p>
                    <p>Account Name: <span className="font-medium">{storeSettings.bank_account_name}</span></p>
                    <p>Account: <span className="font-mono font-bold">{storeSettings.bank_account}</span></p>
                    <p>Branch: <span className="font-medium">{storeSettings.bank_branch}</span></p>
                    <p>Reference: <span className="font-mono font-bold text-orange-400">Your order number</span></p>
                  </div>
                </div>
              )}
            </div>

            {/* Order notes */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-bold text-base mb-4">Order Notes <span className="text-zinc-500 font-normal text-sm">(optional)</span></h2>
              <textarea rows={3} value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder="Any special instructions for delivery or your order..."
                className="w-full px-4 py-3 bg-black border border-zinc-800 hover:border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 resize-none placeholder:text-zinc-600 transition-colors" />
            </div>
          </div>

          {/* ── Right column — Order Summary ── */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
              <h2 className="font-bold text-base mb-5">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 mb-5 max-h-56 overflow-y-auto pr-1">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                      {getProductImage(item.product) ? (
                        <img src={getProductImage(item.product)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product?.name}</p>
                      {(item.color || item.size) && (
                        <p className="text-xs text-zinc-500">{[item.color?.name, item.size?.name].filter(Boolean).join(" · ")}</p>
                      )}
                      <p className="text-xs text-zinc-500">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-orange-400">R{((item.product?.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* ── UPDATED COUPON SECTION ── */}
              <div className="mb-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400">{appliedCoupon}</span>
                    </div>
                    <button onClick={removeCoupon} className="p-1 hover:bg-emerald-500/10 rounded-lg transition-colors">
                      <X className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => setShowCoupon(v => !v)}
                      className="flex items-center gap-2 text-sm text-zinc-400 hover:text-orange-400 transition-colors mb-2">
                      <Tag className="w-3.5 h-3.5" /> Add coupon code
                      {showCoupon ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <AnimatePresence>
                      {showCoupon && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="flex gap-2">
                          <input type="text" value={couponInput}
                            onChange={e => setCouponInput(e.target.value.toUpperCase())}
                            placeholder="SUMMER20" className="flex-1 px-3 py-2 bg-black border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 placeholder:text-zinc-600" />
                          <button type="button" onClick={applyCoupon} disabled={isApplyingCoupon || isCouponLoading || !couponInput.trim()}
                            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 rounded-xl text-sm font-bold transition-all text-white disabled:text-zinc-500">
                            {isApplyingCoupon || isCouponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t border-zinc-800 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Subtotal</span>
                  <span>R{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Shipping {deliverySpeed === "express" && <span className="text-xs text-orange-400 ml-1">(Express)</span>}</span>
                  <span>{totalShipping === 0 ? <span className="text-emerald-400">Free</span> : `R${totalShipping}`}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Coupon ({appliedCoupon})</span>
                    <span>-R{discount.toFixed(2)}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-sm text-amber-400">
                    <span>Loyalty Points</span>
                    <span>-R{loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-3 border-t border-zinc-800">
                  <span>Total</span>
                  <span className="text-orange-400">R{total.toFixed(2)}</span>
                </div>
                {total > 0 && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5 pt-1">
                    <Gift className="w-3 h-3 text-orange-400" />
                    You'll earn <span className="text-orange-400 font-bold">{Math.floor(total / 10)} pts</span> on this order
                  </p>
                )}
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full mt-5 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><Shield className="w-4 h-4" /> Place Order — R{total.toFixed(2)}</>
                )}
              </button>

              <p className="text-center text-xs text-zinc-600 mt-3">
                By placing your order you agree to our Terms & Conditions
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}