

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ChevronLeft, Package, Tag, Loader2, AlertTriangle } from "lucide-react";

export function CartPage() {
  const { user, setCurrentView, setViewParams, toast } = useApp();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const channelRef = useRef<any>(null);

  // Fetch cart with proper product data
  const fetchCart = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch cart items with product details using proper joins
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          *,
          product:products!inner(id, name, slug, price, compare_price, stock_quantity, is_active, images:product_images(*)),
          color:colors(id, name, hex_code),
          size:sizes(id, name)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Filter out items where product is inactive or deleted
      const validItems = (data || []).filter((item: any) => item.product && item.product.is_active !== false);
      setCartItems(validItems);
    } catch (err) {
      toast("Error loading cart", "error");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Real-time subscription for cart updates
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`cart_${user.id}_realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${user.id}` }, fetchCart)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, fetchCart)
      .subscribe();
    channelRef.current = channel;

    return () => { channel.unsubscribe(); };
  }, [user, fetchCart]);

  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Check stock
    if (newQty > (item.product?.stock_quantity || 0)) {
      toast(`Only ${item.product?.stock_quantity} items available`, "error");
      return;
    }

    setUpdating(itemId);
    try {
      const { error } = await supabase.from("cart_items").update({ quantity: newQty }).eq("id", itemId);
      if (error) throw error;
      
      // Optimistic update
      setCartItems(items => items.map(item => item.id === itemId ? { ...item, quantity: newQty } : item));
      toast("Quantity updated", "success");
    } catch (err) {
      toast("Error updating quantity", "error");
      fetchCart(); // Refresh to get correct state
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
      if (error) throw error;
      
      // Optimistic update
      setCartItems(items => items.filter(item => item.id !== itemId));
      toast("Item removed from cart", "success");
    } catch (err) {
      toast("Error removing item", "error");
      fetchCart();
    }
  };

  const applyPromo = async () => {
    if (!promoCode.trim() || !user) return;
    setPromoLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", promoCode.toUpperCase().trim())
        .eq("is_active", true)
        .gte("valid_until", new Date().toISOString())
        .single();
      
      if (error || !data) {
        toast("Invalid or expired promo code", "error");
        setPromoLoading(false);
        return;
      }
      
      // Check usage limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        toast("This promo code has reached its usage limit", "error");
        setPromoLoading(false);
        return;
      }

      let discountAmount = 0;
      if (data.discount_type === "percentage") {
        discountAmount = (subtotal * data.discount_value) / 100;
        if (data.max_discount_amount) discountAmount = Math.min(discountAmount, data.max_discount_amount);
      } else {
        discountAmount = data.discount_value;
      }
      
      setDiscount(Math.min(discountAmount, subtotal));
      setDiscountApplied(true);
      setAppliedCoupon(data.code);
      toast(`Promo code applied! You saved R${discountAmount.toFixed(2)}`, "success");
    } catch (err) {
      toast("Error applying promo code", "error");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setDiscount(0);
    setDiscountApplied(false);
    setAppliedCoupon("");
    setPromoCode("");
  };

  // Calculate totals with proper null checks
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * (item.quantity || 1);
  }, 0);
  
  const shipping = subtotal >= 1500 ? 0 : 80;
  const total = Math.max(0, subtotal + shipping - discount);
  
  // Check for out of stock items
  const outOfStockItems = cartItems.filter(item => (item.product?.stock_quantity || 0) < (item.quantity || 1));

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-zinc-400 mb-4">Sign in to view your cart</p>
          <button onClick={() => setCurrentView("login")} className="px-6 py-2 bg-orange-500 rounded-lg font-bold hover:bg-orange-600 transition-colors">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full" />
        </motion.div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-zinc-400 mb-4">Looks like you haven't added anything yet</p>
          <button onClick={() => setCurrentView("shop")} className="px-6 py-2 bg-orange-500 rounded-lg font-bold hover:bg-orange-600 transition-colors">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => setCurrentView("shop")} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Continue Shopping
        </button>

        <h1 className="text-3xl font-black mb-8">Shopping Cart ({cartItems.length} items)</h1>

        {/* Out of Stock Warning */}
        {outOfStockItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-medium">Some items are out of stock or have insufficient quantity</p>
              <p className="text-sm text-red-400/70">Please adjust quantities or remove unavailable items before checkout.</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => {
                const itemPrice = item.product?.price || 0;
                const itemTotal = itemPrice * (item.quantity || 1);
                const itemOutOfStock = (item.product?.stock_quantity || 0) < (item.quantity || 1);
                const productImage = item.product?.images?.find((img: any) => img.is_primary)?.image_url || item.product?.images?.[0]?.image_url;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    className={`flex gap-4 bg-zinc-900 border rounded-xl p-4 transition-colors ${
                      itemOutOfStock ? "border-red-500/30" : "border-zinc-800"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setCurrentView("product");
                        setViewParams({ slug: item.product?.slug });
                      }}
                      className="w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800"
                    >
                      {productImage ? (
                        <img src={productImage} alt={item.product?.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-zinc-600" />
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => {
                              setCurrentView("product");
                              setViewParams({ slug: item.product?.slug });
                            }}
                            className="text-left"
                          >
                            <h3 className="font-semibold text-sm hover:text-orange-400 transition-colors">{item.product?.name || "Product Unavailable"}</h3>
                          </button>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {item.color?.name && `Color: ${item.color.name}`}
                            {item.color?.name && item.size?.name && " | "}
                            {item.size?.name && `Size: ${item.size.name}`}
                          </p>
                          {itemOutOfStock && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Only {item.product?.stock_quantity || 0} in stock
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-zinc-800 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                            disabled={updating === item.id || (item.quantity || 1) <= 1}
                            className="p-2 hover:bg-white/5 transition-colors disabled:opacity-30"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity || 1}</span>
                          <button
                            onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                            disabled={updating === item.id || (item.quantity || 1) >= (item.product?.stock_quantity || 1)}
                            className="p-2 hover:bg-white/5 transition-colors disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-400">R{itemTotal.toFixed(2)}</p>
                          <p className="text-xs text-zinc-500">R{itemPrice.toFixed(2)} each</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sticky top-24">
              <h2 className="font-bold text-lg mb-6">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="font-medium">R{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Shipping</span>
                  <span className="font-medium">{shipping === 0 ? "Free" : `R${shipping.toFixed(2)}`}</span>
                </div>
                {discountApplied && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Discount ({appliedCoupon})</span>
                    <span>-R{discount.toFixed(2)}</span>
                  </div>
                )}
                {subtotal < 1500 && (
                  <p className="text-xs text-orange-400">Add R{(1500 - subtotal).toFixed(2)} more for free shipping!</p>
                )}
                <div className="border-t border-zinc-800 pt-3 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-xl text-orange-400">R{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="mb-6">
                {!discountApplied ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && applyPromo()}
                      className="flex-1 px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 uppercase"
                    />
                    <button
                      onClick={applyPromo}
                      disabled={!promoCode.trim() || promoLoading}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-emerald-400">{appliedCoupon} applied</span>
                    </div>
                    <button onClick={removePromo} className="text-xs text-zinc-400 hover:text-white transition-colors">Remove</button>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentView("checkout", { discount, appliedCoupon })}
                disabled={outOfStockItems.length > 0}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Checkout <ArrowRight className="w-4 h-4" />
              </motion.button>
              {outOfStockItems.length > 0 && (
                <p className="text-xs text-red-400 text-center mt-2">Remove unavailable items to proceed</p>
              )}
              <p className="text-xs text-zinc-500 text-center mt-3">
                No online payment required. Pay on delivery or via WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

