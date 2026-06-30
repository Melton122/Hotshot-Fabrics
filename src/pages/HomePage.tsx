import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import {
  ArrowRight, ChevronLeft, ChevronRight, Star,
  Heart, Eye, Mail, Flame, ShoppingBag, Zap, TrendingUp, Award, Truck, Bell
} from "lucide-react";
import type { Product, HeroBanner } from "../types";

// ============================================
// LOADING COMPONENTS
// ============================================
function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-6 h-6", md: "w-10 h-10", lg: "w-16 h-16" };
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={`${sizes[size]} border-4 border-orange-500 border-t-transparent rounded-full`}
    />
  );
}

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] bg-zinc-900 rounded-xl mb-3" />
          <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2" />
          <div className="h-4 bg-zinc-900 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// QUICK VIEW MODAL (Inline to avoid missing import)
// ============================================
function QuickViewModal({ product, onClose }: { product: any; onClose: () => void }) {
  const { setCurrentView, setViewParams, user, toast } = useApp();
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const primaryImage = product.images?.find((img: any) => img.is_primary)?.image_url || product.images?.[0]?.image_url;

  const addToCart = async () => {
    if (!user) { toast("Please sign in to add to cart", "info"); setCurrentView("login"); return; }
    if (product.stock_quantity <= 0) { toast("Out of stock", "error"); return; }
    
    setAdding(true);
    try {
      let query = supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", product.id);
      if (selectedColor) query = query.eq("color_id", selectedColor);
      else query = query.is("color_id", null);
      if (selectedSize) query = query.eq("size_id", selectedSize);
      else query = query.is("size_id", null);
      
      const { data: existingItem } = await query.maybeSingle();
      
      let error;
      if (existingItem) {
        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + quantity })
          .eq("id", existingItem.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert({ user_id: user.id, product_id: product.id, color_id: selectedColor || null, size_id: selectedSize || null, quantity });
        error = insertError;
      }
      
      if (error) throw error;
      toast("Added to cart!", "success");
      onClose();
    } catch (err) {
      toast("Error adding to cart", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="aspect-square md:aspect-auto">
            {primaryImage ? (
              <img src={primaryImage} alt={product.name} className="w-full h-full object-cover rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none">
                <div className="text-center">
                  <ShoppingBag className="w-16 h-16 text-zinc-600 mx-auto mb-2" />
                  <span className="text-sm text-zinc-500 font-medium">{product.name}</span>
                </div>
              </div>
            )}
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-orange-500 font-medium uppercase tracking-wider">{product.category?.name}</p>
                <h2 className="text-xl font-bold mt-1">{product.name}</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">×</button>
            </div>
            <p className="text-2xl font-black text-orange-400 mb-4">R{product.price}</p>
            <p className="text-sm text-zinc-400 mb-4 line-clamp-3">{product.short_description || product.description}</p>
            
            {product.colors?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Color</p>
                <div className="flex gap-2">
                  {product.colors.map((color: any) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id === selectedColor ? "" : color.id)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color.id ? "border-orange-500 scale-110" : "border-zinc-700"}`}
                      style={{ backgroundColor: color.hex_code }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {product.sizes?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size: any) => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id === selectedSize ? "" : size.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${selectedSize === size.id ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-zinc-800"}`}
                    >{size.name}</button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-zinc-800 rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-white/5"><span className="text-lg">−</span></button>
                <span className="w-10 text-center font-bold">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))} className="p-2 hover:bg-white/5"><span className="text-lg">+</span></button>
              </div>
              <button
                onClick={addToCart}
                disabled={adding || product.stock_quantity <= 0}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {adding ? <LoadingSpinner size="sm" /> : <><ShoppingBag className="w-5 h-5" /> Add to Cart</>}
              </button>
            </div>
            
            <button
              onClick={() => { setCurrentView("product"); setViewParams({ slug: product.slug }); onClose(); }}
              className="w-full py-2 text-sm text-orange-400 hover:text-orange-300 font-medium"
            >
              View Full Details →
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// HERO SECTION
// ============================================
function HeroSection() {
  const { setCurrentView } = useApp();
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: supaError } = await supabase
        .from("hero_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (supaError) throw supaError;
      setBanners(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load banners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();

    // Real-time subscription
    const channel = supabase
      .channel("hero_banners_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "hero_banners" }, fetchBanners)
      .subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [fetchBanners]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading) {
    return (
      <section className="relative h-[70vh] lg:h-[85vh] bg-zinc-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </section>
    );
  }

  if (error || banners.length === 0) {
    return (
      <section className="relative h-[70vh] lg:h-[85vh] bg-gradient-to-br from-zinc-900 to-black flex items-center">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400 text-sm font-medium mb-6"
          >
            <Flame className="w-4 h-4" /> New Collection 2026
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-tight mb-4"
          >
            HOTSHOT<br />FABRICS
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-zinc-300 mb-8 max-w-lg"
          >
            Premium South African fashion. Quality fabrics, bold designs.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentView("shop")}
            className="px-8 py-4 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-lg flex items-center gap-2 transition-colors"
          >
            Shop Now <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-[70vh] lg:h-[85vh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img
            src={banners[currentSlide].image_url}
            alt={banners[currentSlide].title}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            key={`text-${currentSlide}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400 text-sm font-medium mb-6">
              <Flame className="w-4 h-4" /> New Collection 2026
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-tight mb-4">
              {banners[currentSlide].title}
            </h1>
            <p className="text-lg sm:text-xl text-zinc-300 mb-8">
              {banners[currentSlide].subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView("shop")}
                className="px-8 py-4 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-lg flex items-center gap-2 transition-colors"
              >
                {banners[currentSlide].button_text || "Shop Now"} <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentSlide ? "w-8 bg-orange-500" : "w-2 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </section>
  );
}

// ============================================
// FEATURES BAR
// ============================================
function FeaturesBar() {
  const features = [
    { icon: Truck, label: "Free Shipping", sub: "Over R1,500" },
    { icon: Zap, label: "Fast Delivery", sub: "3-5 Days" },
    { icon: Award, label: "Premium Quality", sub: "Guaranteed" },
    { icon: TrendingUp, label: "Trending", sub: "New Arrivals" },
  ];

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl"
          >
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <f.icon className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-bold text-sm">{f.label}</p>
              <p className="text-xs text-zinc-500">{f.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// PRODUCT CARD
// ============================================
function ProductCard({ product, index }: { product: Product; index: number }) {
  const { setCurrentView, setViewParams, user, toast } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Check wishlist status on mount
  useEffect(() => {
    if (!user || !product?.id) return;
    const checkWishlist = async () => {
      const { data } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();
      setIsWishlisted(!!data);
    };
    checkWishlist();
  }, [user, product?.id]);

  const primaryImage: string | undefined = !imageError
    ? (product.images?.find((img) => img.is_primary)?.image_url || product.images?.[0]?.image_url || undefined)
    : undefined;
  const secondImage: string | undefined = !imageError
    ? (product.images?.[1]?.image_url || primaryImage || undefined)
    : undefined;

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast("Please sign in to add to wishlist", "info");
      setCurrentView("login");
      return;
    }
    try {
      setIsAdding(true);
      if (isWishlisted) {
        const { error } = await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", product.id);
        if (error) throw error;
        setIsWishlisted(false);
        toast("Removed from wishlist", "success");
      } else {
        const { error } = await supabase.from("wishlist").insert({ user_id: user.id, product_id: product.id });
        if (error) throw error;
        setIsWishlisted(true);
        toast("Added to wishlist", "success");
      }
    } catch (err) {
      toast("Error updating wishlist", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  const outOfStock = (product.stock_quantity || 0) <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 mb-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={isHovered ? "second" : "first"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            {(isHovered ? secondImage : primaryImage) ? (
              <img
                src={isHovered ? secondImage : primaryImage}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                <div className="text-center">
                  <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                  <span className="text-xs text-zinc-600 font-medium">{product.name}</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.is_new_arrival && (
            <span className="px-2 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase rounded">New</span>
          )}
          {discount > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold uppercase rounded">
              -{discount}%
            </span>
          )}
          {outOfStock && (
            <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded">
              Out of Stock
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
          className="absolute bottom-3 left-3 right-3 flex gap-2"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              const event = new CustomEvent('openQuickView', { detail: product });
              window.dispatchEvent(event);
            }}
            className="flex-1 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-4 h-4" /> Quick View
          </button>
          <button
            onClick={toggleWishlist}
            disabled={isAdding}
            className="w-10 h-10 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? "text-red-500 fill-red-500" : "text-black"}`} />
          </button>
        </motion.div>
      </div>

      <button
        onClick={() => { setCurrentView("product"); setViewParams({ slug: product.slug }); }}
        className="text-left w-full"
      >
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{product.category?.name}</p>
        <h3 className="font-semibold text-sm mt-0.5 group-hover:text-orange-400 transition-colors line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold text-orange-400">R{product.price}</span>
          {product.compare_price && product.compare_price > 0 && (
            <span className="text-sm text-zinc-500 line-through">R{product.compare_price}</span>
          )}
        </div>
        {(product.rating || 0) > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
            <span className="text-xs text-zinc-400">{product.rating} ({product.review_count || 0})</span>
          </div>
        )}
      </button>
    </motion.div>
  );
}

// ============================================
// PRODUCT SECTION (reusable)
// ============================================
function ProductSection({
  title,
  subtitle,
  tag,
  sortField,
  limit = 8,
}: {
  title: string;
  subtitle: string;
  tag?: "is_new_arrival" | "is_bestseller";
  sortField?: "created_at" | "view_count" | "rating";
  limit?: number;
}) {
  const { setCurrentView } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let query = supabase
        .from("products")
        .select("*, images:product_images(*), category:categories(name)")
        .eq("is_active", true);

      if (tag) query = query.eq(tag, true);

      switch (sortField) {
        case "view_count":
          query = query.order("view_count", { ascending: false });
          break;
        case "rating":
          query = query.order("rating", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error: supaError } = await query.limit(limit);
      if (supaError) throw supaError;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, [tag, sortField, limit]);

  useEffect(() => {
    fetchProducts();

    // Real-time subscription for products
    const channel = supabase
      .channel(`products_${tag || "all"}_${sortField || "default"}_${limit}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchProducts)
      .on("postgres_changes", { event: "*", schema: "public", table: "product_images" }, fetchProducts)
      .subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [fetchProducts, tag, sortField, limit]);

  if (isLoading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
        <div className="text-center mb-12">
          <span className="text-orange-500 font-bold text-sm uppercase tracking-wider">{subtitle}</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">{title}</h2>
        </div>
        <SkeletonGrid count={limit} />
      </section>
    );
  }

  if (error || !products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-end justify-between mb-12"
      >
        <div>
          <span className="text-orange-500 font-bold text-sm uppercase tracking-wider">{subtitle}</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">{title}</h2>
        </div>
        <button
          onClick={() => setCurrentView("shop")}
          className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-orange-400 transition-colors"
        >
          View All <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}

// ============================================
// CATEGORY IMAGE (with fallback)
// ============================================
function CategoryImage({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const [error, setError] = useState(false);

  if (!imageUrl || error) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
        <ShoppingBag className="w-10 h-10 text-zinc-600" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

// ============================================
// CATEGORY SECTION
// ============================================
function CategorySection() {
  const { setCurrentView } = useApp();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .limit(4);
      if (data) setCategories(data);
      setLoading(false);
    };
    fetchCategories();

    const channel = supabase
      .channel("categories_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetchCategories())
      .subscribe();
    channelRef.current = channel;

    return () => { channel.unsubscribe(); };
  }, []);

  if (loading) return <SkeletonGrid count={4} />;
  if (categories.length === 0) return null;

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <span className="text-orange-500 font-bold text-sm uppercase tracking-wider">Browse</span>
        <h2 className="text-3xl lg:text-4xl font-black mt-2">Shop by Category</h2>
      </motion.div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {categories.map((cat, i) => (
          <motion.button
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCurrentView("shop", { category: cat.id })}
            className="relative aspect-[4/3] rounded-xl overflow-hidden group"
          >
            <CategoryImage name={cat.name} imageUrl={cat.image_url} />
            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <h3 className="text-xl font-bold text-white">{cat.name}</h3>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

// ============================================
// ANNOUNCEMENTS / NEWS SECTION
// ============================================
function NewsSection() {
  const { toast } = useApp();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from("home_announcements")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .limit(3);
        if (error) throw error;
        setAnnouncements(data || []);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();

    const channel = supabase
      .channel("home_announcements_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "home_announcements" }, fetchAnnouncements)
      .subscribe();
    channelRef.current = channel;

    return () => { channel.unsubscribe(); };
  }, []);

  if (loading || announcements.length === 0) return null;

  return (
    <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {announcements.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`${item.bg_color} ${item.border_color} border rounded-2xl p-5`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${item.bg_color} ${item.border_color} border flex items-center justify-center flex-shrink-0`}>
                <Bell className={`w-5 h-5 ${item.text_color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${item.bg_color} ${item.text_color} ${item.border_color} border`}>
                    {item.badge}
                  </span>
                </div>
                <h3 className={`font-bold text-sm ${item.text_color} mb-1`}>{item.title}</h3>
                {item.content && <p className="text-xs text-zinc-400 line-clamp-2">{item.content}</p>}
                {item.link_url && (
                  <a
                    href={item.link_url}
                    className={`text-xs font-medium ${item.text_color} hover:underline mt-2 inline-block`}
                  >
                    {item.link_text} →
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// RANDOM PICKS SECTION
// ============================================
function RandomPicksSection() {
  const { setCurrentView } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<any>(null);

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*, images:product_images(*), category:categories(name)")
          .eq("is_active", true)
          .limit(20);

        if (error) throw error;
        const shuffled = shuffleArray(data || []).slice(0, 8);
        setProducts(shuffled);
      } catch (err) {
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();

    const channel = supabase
      .channel("random_products_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchProducts)
      .on("postgres_changes", { event: "*", schema: "public", table: "product_images" }, fetchProducts)
      .subscribe();
    channelRef.current = channel;

    return () => { channel.unsubscribe(); };
  }, []);

  if (isLoading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
        <div className="text-center mb-12">
          <span className="text-orange-500 font-bold text-sm uppercase tracking-wider">Surprise Me</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">Random Picks</h2>
        </div>
        <SkeletonGrid count={8} />
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-end justify-between mb-12"
      >
        <div>
          <span className="text-orange-500 font-bold text-sm uppercase tracking-wider">Surprise Me</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">Random Picks</h2>
        </div>
        <button
          onClick={() => setCurrentView("shop")}
          className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-orange-400 transition-colors"
        >
          View All <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}

// ============================================
// NEWSLETTER
// ============================================
function Newsletter() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({ email });
      if (error) {
        if (error.code === "23505") {
          toast("You're already subscribed!", "info");
        } else {
          throw error;
        }
      } else {
        toast("Successfully subscribed!", "success");
        setEmail("");
      }
    } catch (err) {
      toast("Failed to subscribe. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-zinc-900 rounded-3xl p-8 lg:p-16 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <Mail className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-3xl lg:text-4xl font-black mb-4">Join the Hotshot Family</h2>
          <p className="text-zinc-400 max-w-lg mx-auto mb-8">
            Subscribe for exclusive offers, early access to new drops, and style tips.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 rounded-xl font-bold transition-colors whitespace-nowrap"
            >
              {isSubmitting ? "..." : "Subscribe"}
            </button>
          </form>
        </div>
      </motion.div>
    </section>
  );
}

// ============================================
// HOME PAGE
// ============================================
export function HomePage() {
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  useEffect(() => {
    const handleQuickView = (e: Event) => {
      const customEvent = e as CustomEvent;
      setQuickViewProduct(customEvent.detail);
    };
    window.addEventListener('openQuickView', handleQuickView);
    return () => window.removeEventListener('openQuickView', handleQuickView);
  }, []);

  return (
    <div>
      <HeroSection />
      <NewsSection />
      <FeaturesBar />
      <CategorySection />
      <ProductSection
        title="New Arrivals"
        subtitle="Just In"
        tag="is_new_arrival"
        sortField="created_at"
        limit={8}
      />
      <ProductSection
        title="Best Sellers"
        subtitle="Popular"
        tag="is_bestseller"
        sortField="rating"
        limit={4}
      />
      <RandomPicksSection />
      <ProductSection
        title="Most Viewed"
        subtitle="Trending Now"
        sortField="view_count"
        limit={6}
      />
      <Newsletter />
      
      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewProduct && (
          <QuickViewModal 
            product={quickViewProduct} 
            onClose={() => setQuickViewProduct(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}