

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import { Heart, ShoppingBag, Trash2, ArrowRight, Loader2, Package } from "lucide-react";

export function WishlistPage() {
  const { user, setCurrentView, setViewParams, toast } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchWishlist = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wishlist")
        .select(`
          *,
          product:products!inner(id, name, slug, price, compare_price, stock_quantity, is_active, images:product_images(*))
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Filter out inactive products
      const validItems = (data || []).filter((item: any) => item.product && item.product.is_active !== false);
      setItems(validItems);
    } catch (err) {
      toast("Error loading wishlist", "error");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`wishlist_${user.id}_realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wishlist", filter: `user_id=eq.${user.id}` }, fetchWishlist)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, fetchWishlist)
      .subscribe();
    channelRef.current = channel;

    return () => { channel.unsubscribe(); };
  }, [user, fetchWishlist]);

  const removeFromWishlist = async (itemId: string) => {
    try {
      const { error } = await supabase.from("wishlist").delete().eq("id", itemId);
      if (error) throw error;
      
      // Optimistic update
      setItems(items => items.filter(item => item.id !== itemId));
      toast("Removed from wishlist", "success");
    } catch (err) {
      toast("Error removing item", "error");
      fetchWishlist();
    }
  };

  const addToCart = async (productId: string, itemId: string) => {
    if (!user) return;
    
    const item = items.find(i => i.id === itemId);
    if (!item?.product) return;
    
    // Check stock
    if ((item.product.stock_quantity || 0) <= 0) {
      toast("This item is out of stock", "error");
      return;
    }

    setAddingToCart(itemId);
    try {
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .is("color_id", null)
        .is("size_id", null)
        .maybeSingle();

      let error;
      if (existingItem) {
        const newQty = existingItem.quantity + 1;
        if (newQty > (item.product.stock_quantity || 0)) {
          toast("Cannot add more. Stock limit reached.", "error");
          setAddingToCart(null);
          return;
        }
        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: newQty })
          .eq("id", existingItem.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert({ user_id: user.id, product_id: productId, quantity: 1 });
        error = insertError;
      }

      if (error) throw error;
      toast("Added to cart!", "success");
    } catch (err) {
      toast("Error adding to cart", "error");
    } finally {
      setAddingToCart(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Please sign in</h2>
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
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-zinc-400 mb-4">Save items you love for later</p>
          <button onClick={() => setCurrentView("shop")} className="px-6 py-2 bg-orange-500 rounded-lg font-bold hover:bg-orange-600 transition-colors">
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black mb-8">My Wishlist ({items.length} items)</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          <AnimatePresence>
            {items.map((item, i) => {
              const product = item.product;
              const productImage = product?.images?.find((img: any) => img.is_primary)?.image_url || product?.images?.[0]?.image_url;
              const outOfStock = (product?.stock_quantity || 0) <= 0;
              const discount = product?.compare_price && product.compare_price > product.price
                ? Math.round((1 - product.price / product.compare_price) * 100)
                : 0;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="group"
                >
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 mb-3">
                    <button
                      onClick={() => { setCurrentView("product"); setViewParams({ slug: product?.slug }); }}
                      className="w-full h-full"
                    >
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={product?.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-zinc-600" />
                        </div>
                      )}
                    </button>
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      {discount > 0 && (
                        <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold uppercase rounded">-{discount}%</span>
                      )}
                      {outOfStock && (
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded">Out of Stock</span>
                      )}
                    </div>

                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-red-500/80 rounded-full flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => { setCurrentView("product"); setViewParams({ slug: product?.slug }); }}
                    className="text-left w-full"
                  >
                    <h3 className="font-semibold text-sm group-hover:text-orange-400 transition-colors line-clamp-1">{product?.name || "Unknown Product"}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-orange-400 font-bold">R{product?.price || 0}</p>
                      {product?.compare_price && product.compare_price > 0 && (
                        <p className="text-xs text-zinc-500 line-through">R{product.compare_price}</p>
                      )}
                    </div>
                  </button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToCart(product?.id, item.id)}
                    disabled={addingToCart === item.id || outOfStock}
                    className="w-full mt-2 py-2 bg-zinc-800 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {addingToCart === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : outOfStock ? (
                      "Out of Stock"
                    ) : (
                      <><ShoppingBag className="w-4 h-4" /> Add to Cart</>
                    )}
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

