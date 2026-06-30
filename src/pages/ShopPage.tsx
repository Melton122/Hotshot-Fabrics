import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import {
  Search, SlidersHorizontal, Grid3X3, LayoutList, X, ChevronDown,
  Star, Heart, Eye, ArrowUpDown, Filter, ShoppingBag, Loader2,
  Sparkles, TrendingUp, Tag, Package
} from "lucide-react";

// ============================================
// QUICK VIEW MODAL
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
            <img src={primaryImage || "https://via.placeholder.com/400"} alt={product.name} className="w-full h-full object-cover rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none" />
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-orange-500 font-medium uppercase tracking-wider">{product.category?.name}</p>
                <h2 className="text-xl font-bold mt-1">{product.name}</h2>
                {product.sku && <p className="text-xs text-zinc-500 font-mono mt-1">SKU: {product.sku}</p>}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-xl">×</button>
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
                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShoppingBag className="w-5 h-5" /> Add to Cart</>}
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
// PRODUCT GRID CARD
// ============================================
function ProductGridCard({ product, index, onWishlist, onQuickView }: { product: any; index: number; onWishlist: (id: string) => void; onQuickView: (p: any) => void; }) {
  const { setCurrentView, setViewParams, user } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  const primaryImage = !imageError
    ? (product.images?.find((img: any) => img.is_primary)?.image_url || product.images?.[0]?.image_url)
    : null;
  const secondImage = !imageError
    ? (product.images?.[1]?.image_url || primaryImage)
    : null;

  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;
  const outOfStock = (product.stock_quantity || 0) <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03 }}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 mb-3">
        <AnimatePresence>
          <motion.img
            key={isHovered ? "second" : "first"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            src={isHovered ? secondImage : primaryImage}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        </AnimatePresence>

        {!primaryImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
            <ShoppingBag className="w-12 h-12 text-zinc-600" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.is_new_arrival && (
            <span className="px-2 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase rounded flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> New
            </span>
          )}
          {product.is_bestseller && (
            <span className="px-2 py-1 bg-purple-500 text-white text-[10px] font-bold uppercase rounded flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Best
            </span>
          )}
          {discount > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold uppercase rounded">-{discount}%</span>
          )}
          {outOfStock && (
            <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded">Out of Stock</span>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
          className="absolute bottom-3 left-3 right-3 flex gap-2"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
            className="flex-1 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-4 h-4" /> Quick View
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onWishlist(product.id); }}
            className="w-10 h-10 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center transition-colors"
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
        <h3 className="font-semibold text-sm mt-0.5 group-hover:text-orange-400 transition-colors line-clamp-1">{product.name}</h3>
        {product.sku && <p className="text-[10px] text-zinc-600 font-mono">{product.sku}</p>}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold text-orange-400">R{product.price}</span>
          {product.compare_price && product.compare_price > 0 && (
            <span className="text-sm text-zinc-500 line-through">R{product.compare_price}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {(product.rating || 0) > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
              <span className="text-xs text-zinc-400">{product.rating}</span>
            </div>
          )}
          {product.total_sales > 0 && (
            <span className="text-[10px] text-zinc-500">{product.total_sales} sold</span>
          )}
        </div>
      </button>
    </motion.div>
  );
}

// ============================================
// PRODUCT LIST CARD
// ============================================
function ProductListCard({ product, index, onWishlist, onQuickView }: { product: any; index: number; onWishlist: (id: string) => void; onQuickView: (p: any) => void; }) {
  const { setCurrentView, setViewParams, user } = useApp();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  const primaryImage = !imageError
    ? (product.images?.find((img: any) => img.is_primary)?.image_url || product.images?.[0]?.image_url)
    : null;

  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03 }}
      className="flex gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
    >
      <button
        onClick={() => { setCurrentView("product"); setViewParams({ slug: product.slug }); }}
        className="w-32 h-40 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800"
      >
        {primaryImage ? (
          <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" loading="lazy" onError={() => setImageError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-zinc-600" />
          </div>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{product.category?.name}</p>
            <button
              onClick={() => { setCurrentView("product"); setViewParams({ slug: product.slug }); }}
              className="text-left"
            >
              <h3 className="font-semibold hover:text-orange-400 transition-colors">{product.name}</h3>
            </button>
            {product.sku && <p className="text-[10px] text-zinc-600 font-mono">{product.sku}</p>}
          </div>
          <div className="flex gap-1">
            {product.is_new_arrival && <Sparkles className="w-3 h-3 text-orange-500" />}
            {product.is_bestseller && <TrendingUp className="w-3 h-3 text-purple-500" />}
          </div>
        </div>
        <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{product.short_description || product.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-bold text-orange-400 text-lg">R{product.price}</span>
          {product.compare_price && product.compare_price > 0 && (
            <span className="text-sm text-zinc-500 line-through">R{product.compare_price}</span>
          )}
          {discount > 0 && (
            <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded">-{discount}%</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
          {product.rating > 0 && (
            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-orange-400 text-orange-400" /> {product.rating}</span>
          )}
          <span>Stock: {product.stock_quantity}</span>
          {product.total_sales > 0 && <span>{product.total_sales} sold</span>}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onQuickView(product)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-bold transition-colors"
          >
            Quick View
          </button>
          <button
            onClick={() => onWishlist(product.id)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? "text-red-500 fill-red-500" : ""}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN SHOP PAGE
// ============================================
export function ShopPage() {
  const { setCurrentView, setViewParams, user, toast, viewParams } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState({
    category: viewParams?.category || "",
    color: "",
    size: "",
    minPrice: "",
    maxPrice: "",
    tag: ""
  });
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [socialProof, setSocialProof] = useState<{ name: string; product: string } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);

  // Back to top visibility
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Clear category param from viewParams after consuming it
  useEffect(() => {
    if (viewParams?.category) {
      setViewParams({ category: undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Social proof: random "someone just bought" pop-up every 30-90 seconds
  useEffect(() => {
    const names = ["Zanele", "Thabo", "Keanu", "Siphiwe", "Amara", "Lebo", "Riaan", "Nomsa"];
    const items = ["Satin Wrap Dress", "Ankara Print Set", "Linen Blend Shirt", "Velvet Blazer", "Silk Midi Skirt"];
    const show = () => {
      const name = names[Math.floor(Math.random() * names.length)];
      const product = items[Math.floor(Math.random() * items.length)];
      setSocialProof({ name, product });
      setTimeout(() => setSocialProof(null), 4000);
    };
    const delay = 12000 + Math.random() * 8000;
    const timer = setTimeout(() => {
      show();
      const interval = setInterval(show, 35000 + Math.random() * 25000);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkSize = () => setIsLargeScreen(window.innerWidth >= 1024);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const fetchFilters = useCallback(async () => {
    const [{ data: cats }, { data: cols }, { data: sizs }] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("colors").select("*").order("sort_order"),
      supabase.from("sizes").select("*").order("sort_order")
    ]);
    if (cats) setCategories(cats);
    if (cols) setColors(cols);
    if (sizs) setSizes(sizs);
  }, []);

  // ─── FETCH PRODUCTS ───
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Build query with LEFT joins (not INNER) so products without colors/sizes still show
      let query = supabase
        .from("products")
        .select(`
          *,
          images:product_images(*),
          category:categories(name),
          colors:product_colors(color_id, colors:color_id(*)),
          sizes:product_sizes(size_id, sizes:size_id(*))
        `)
        .eq("is_active", true);

      if (searchQuery.trim()) {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
      }

      if (filters.category) {
        query = query.eq("category_id", filters.category);
      }

      if (filters.minPrice) {
        query = query.gte("price", parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        query = query.lte("price", parseFloat(filters.maxPrice));
      }

      if (filters.tag) {
        query = query.eq(filters.tag, true);
      }

      // Sorting
      switch (sortBy) {
        case "newest": query = query.order("created_at", { ascending: false }); break;
        case "popular": query = query.order("view_count", { ascending: false }); break;
        case "price-low": query = query.order("price", { ascending: true }); break;
        case "price-high": query = query.order("price", { ascending: false }); break;
        case "rating": query = query.order("rating", { ascending: false }); break;
        case "sales": query = query.order("total_sales", { ascending: false }); break;
      }

      const { data, error } = await query.limit(48);
      if (error) throw error;

      // Flatten nested data
      const flattened = (data || []).map((p: any) => ({
        ...p,
        colors: (p.colors || [])
          .map((c: any) => c.colors || c.color_id)
          .filter(Boolean)
          .filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.id === v.id) === i),
        sizes: (p.sizes || [])
          .map((s: any) => s.sizes || s.size_id)
          .filter(Boolean)
          .filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.id === v.id) === i),
      }));

      // Client-side filter for color/size since we can't do it cleanly with LEFT joins
      let filtered = flattened;
      if (filters.color) {
        filtered = filtered.filter((p: any) => 
          p.colors?.some((c: any) => c.id === filters.color)
        );
      }
      if (filters.size) {
        filtered = filtered.filter((p: any) => 
          p.sizes?.some((s: any) => s.id === filters.size)
        );
      }

      setProducts(filtered);
    } catch (err) {
      toast("Error loading products", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, searchQuery, toast]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, filters.category, filters.tag, filters.minPrice, filters.maxPrice, sortBy, fetchProducts]);

  // Separate effect for color/size filters (client-side)
  useEffect(() => {
    fetchProducts();
  }, [filters.color, filters.size]);

  useEffect(() => {
    fetchFilters();
    fetchProducts();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("shop_products_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchProducts)
      .on("postgres_changes", { event: "*", schema: "public", table: "product_images" }, fetchProducts)
      .on("postgres_changes", { event: "*", schema: "public", table: "product_colors" }, fetchProducts)
      .on("postgres_changes", { event: "*", schema: "public", table: "product_sizes" }, fetchProducts)
      .subscribe();
    channelRef.current = channel;

    return () => { channel.unsubscribe(); };
  }, [fetchProducts]);

  const toggleWishlist = async (productId: string) => {
    if (!user) { toast("Please sign in to add to wishlist", "info"); setCurrentView("login"); return; }

    const { data: existing } = await supabase
      .from("wishlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("wishlist").delete().eq("id", existing.id);
      if (error) toast("Error removing item", "error");
      else toast("Removed from wishlist", "success");
    } else {
      const { error } = await supabase.from("wishlist").insert({ user_id: user.id, product_id: productId });
      if (error) toast("Already in wishlist", "info");
      else toast("Added to wishlist", "success");
    }
    fetchProducts();
  };

  const clearFilters = () => {
    setFilters({ category: "", color: "", size: "", minPrice: "", maxPrice: "", tag: "" });
    setSearchQuery("");
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length + (searchQuery ? 1 : 0);
  const showSidebar = showFilters || isLargeScreen;

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Header */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black">Shop All</h1>
            <p className="text-zinc-400 mt-1">{products.length} products</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 w-40 sm:w-48 lg:w-64 transition-colors"
              />
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="sales">Best Selling</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>

            <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-zinc-700" : ""}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-zinc-700" : ""}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>

            {!isLargeScreen && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-medium hover:border-orange-500 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {searchQuery && (
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-400 flex items-center gap-1">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery("")} className="hover:text-white">×</button>
              </span>
            )}
            {filters.category && (
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-400 flex items-center gap-1">
                {categories.find(c => c.id === filters.category)?.name}
                <button onClick={() => setFilters({ ...filters, category: "" })} className="hover:text-white">×</button>
              </span>
            )}
            {filters.color && (
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-400 flex items-center gap-1">
                Color: {colors.find(c => c.id === filters.color)?.name}
                <button onClick={() => setFilters({ ...filters, color: "" })} className="hover:text-white">×</button>
              </span>
            )}
            {filters.size && (
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-400 flex items-center gap-1">
                Size: {sizes.find(s => s.id === filters.size)?.name}
                <button onClick={() => setFilters({ ...filters, size: "" })} className="hover:text-white">×</button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-400 flex items-center gap-1">
                R{filters.minPrice || 0} - R{filters.maxPrice || "∞"}
                <button onClick={() => setFilters({ ...filters, minPrice: "", maxPrice: "" })} className="hover:text-white">×</button>
              </span>
            )}
            {filters.tag && (
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-400 flex items-center gap-1">
                {filters.tag === "is_new_arrival" ? "New" : filters.tag === "is_bestseller" ? "Bestseller" : filters.tag}
                <button onClick={() => setFilters({ ...filters, tag: "" })} className="hover:text-white">×</button>
              </span>
            )}
            <button onClick={clearFilters} className="text-xs text-zinc-500 hover:text-white underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <AnimatePresence>
            {showSidebar && (
              <motion.aside
                initial={isLargeScreen ? false : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={isLargeScreen ? undefined : { opacity: 0, x: -20 }}
                className={isLargeScreen ? "w-64 flex-shrink-0" : "fixed inset-0 z-50 bg-black p-4 overflow-auto"}
              >
                {!isLargeScreen && (
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Filters</h2>
                    <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-white/10 rounded-full">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Categories */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider">Categories</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setFilters({ ...filters, category: "" })}
                        className={`block text-sm w-full text-left py-1 ${!filters.category ? "text-orange-400 font-medium" : "text-zinc-400 hover:text-white"}`}
                      >
                        All Categories
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setFilters({ ...filters, category: cat.id })}
                          className={`block text-sm w-full text-left py-1 ${filters.category === cat.id ? "text-orange-400 font-medium" : "text-zinc-400 hover:text-white"}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider">Price Range</h3>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider">Colors</h3>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => setFilters({ ...filters, color: filters.color === color.id ? "" : color.id })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${filters.color === color.id ? "border-orange-500 scale-110" : "border-zinc-700 hover:border-zinc-500"}`}
                          style={{ backgroundColor: color.hex_code }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Sizes */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider">Sizes</h3>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size.id}
                          onClick={() => setFilters({ ...filters, size: filters.size === size.id ? "" : size.id })}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            filters.size === size.id
                              ? "border-orange-500 bg-orange-500/10 text-orange-400"
                              : "border-zinc-800 hover:border-zinc-600"
                          }`}
                        >
                          {size.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "", label: "All" },
                        { key: "is_new_arrival", label: "New" },
                        { key: "is_bestseller", label: "Best Seller" },
                      ].map((tag) => (
                        <button
                          key={tag.key}
                          onClick={() => setFilters({ ...filters, tag: tag.key })}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            filters.tag === tag.key
                              ? "border-orange-500 bg-orange-500/10 text-orange-400"
                              : "border-zinc-800 hover:border-zinc-600"
                          }`}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="w-full py-2 border border-zinc-700 rounded-lg text-sm hover:border-orange-500 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6"
                : "space-y-4"
              }>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-zinc-900 rounded-xl mb-3" />
                    <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-zinc-900 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No products found</h3>
                <p className="text-zinc-400 mb-4">Try adjusting your filters or search query</p>
                <button onClick={clearFilters} className="px-6 py-2 bg-orange-500 rounded-lg font-medium hover:bg-orange-600 transition-colors">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6"
                : "space-y-4"
              }>
                {products.map((product, i) => (
                  viewMode === "grid" ? (
                    <ProductGridCard key={product.id} product={product} index={i} onWishlist={toggleWishlist} onQuickView={setQuickViewProduct} />
                  ) : (
                    <ProductListCard key={product.id} product={product} index={i} onWishlist={toggleWishlist} onQuickView={setQuickViewProduct} />
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewProduct && (
          <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
        )}
      </AnimatePresence>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-40 w-11 h-11 bg-orange-500 hover:bg-orange-600 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center transition-colors"
            aria-label="Back to top"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Social Proof Notification */}
      <AnimatePresence>
        {socialProof && (
          <motion.div
            initial={{ opacity: 0, x: -30, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -30, y: 0 }}
            className="fixed bottom-6 left-6 z-40 bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex items-center gap-3 shadow-xl max-w-[240px]"
          >
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-4 h-4 text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate"><span className="text-orange-400">{socialProof.name}</span> just bought</p>
              <p className="text-[11px] text-zinc-400 truncate">{socialProof.product}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}