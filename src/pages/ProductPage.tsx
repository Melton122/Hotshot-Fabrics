// ============================================
// HOTSHOT FABRICS - PRODUCT PAGE
// Production Ready | Multi-Color Images | Front/Back Views | Full Reviews
// ============================================
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useApp, supabase } from "../AppContext";
import {
  Heart, Share2, ShoppingBag, ChevronLeft, ChevronRight, Star,
  Truck, Shield, RotateCcw, Minus, Plus, Check, MessageCircle,
  X, Loader2, AlertTriangle, ZoomIn, Copy, Package, Tag,
  ThumbsUp, Send, User, MapPin, Clock, CreditCard, HelpCircle,
  ChevronDown, Sparkles, TrendingUp, Eye, ArrowRight,Zap, Camera
} from "lucide-react";

// ─── TYPES ───
interface ProductImage {
  id?: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order?: number;
  color_id?: string | null;
  view_type?: "front" | "back" | "side" | "detail" | null;
}

interface ColorOption {
  id: string;
  name: string;
  hex_code: string;
}

interface SizeOption {
  id: string;
  name: string;
}

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  helpful_count?: number;
}

interface ProductVariant {
  id: string;
  color_id?: string;
  size_id?: string;
  price?: number;
  compare_price?: number;
  stock_quantity: number;
  sku?: string;
  image_url?: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price?: number;
  images?: ProductImage[];
  rating?: number;
  is_new_arrival?: boolean;
  is_bestseller?: boolean;
}

// ─── VIEW TYPE LABELS ───
const VIEW_TYPE_LABELS: Record<string, string> = {
  front: "Front",
  back: "Back",
  side: "Side",
  detail: "Detail"
};

export function ProductPage({ productSlug }: { productSlug: string }) {
  const { user, profile, setCurrentView, setViewParams, toast } = useApp();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [colorObjects, setColorObjects] = useState<ColorOption[]>([]);
  const [sizeObjects, setSizeObjects] = useState<SizeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "reviews" | "shipping">("description");
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", content: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedViewType, setSelectedViewType] = useState<string | null>(null);
  const [imageLightbox, setImageLightbox] = useState<string | null>(null);
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [reviewFilter, setReviewFilter] = useState<"all" | 5 | 4 | 3 | 2 | 1>("all");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const channelRef = useRef<any>(null);
  const imageScrollRef = useRef<HTMLDivElement>(null);

  // ─── FETCH PRODUCT (NO JOINS - SEPARATE QUERIES) ───
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch product WITHOUT joins
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("slug", productSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (productError) throw productError;
      if (!productData) { setProduct(null); setLoading(false); return; }

      // 2. Fetch images separately
      const { data: imagesData } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productData.id)
        .order("sort_order", { ascending: true });

      const sortedImages = (imagesData || []).sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
      setProductImages(sortedImages);

      // 3. Fetch category
      let category = null;
      if (productData.category_id) {
        const { data: catData } = await supabase
          .from("categories")
          .select("id, name, slug")
          .eq("id", productData.category_id)
          .maybeSingle();
        category = catData;
      }

      // 4. Fetch colors
      let colors: ColorOption[] = [];
      if (productData.colors && productData.colors.length > 0) {
        const { data: cols } = await supabase
          .from("colors")
          .select("*")
          .in("id", productData.colors);
        colors = cols || [];
      }
      setColorObjects(colors);

      // 5. Fetch sizes
      let sizes: SizeOption[] = [];
      if (productData.sizes && productData.sizes.length > 0) {
        const { data: sizs } = await supabase
          .from("sizes")
          .select("*")
          .in("id", productData.sizes);
        sizes = sizs || [];
      }
      setSizeObjects(sizes);

      setProduct({ ...productData, category });

      // 6. Fetch variants
      const { data: variantData } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productData.id);
      setVariants(variantData || []);

      // 7. Increment view count
      void (async () => { try { await supabase.rpc("increment_view_count", { product_id: productData.id }); } catch { /* ignore */ } })();

      // 8. Related products
      if (productData.category_id) {
        const { data: related } = await supabase
          .from("products")
          .select("id, name, slug, price, compare_price, is_new_arrival, is_bestseller, rating")
          .eq("category_id", productData.category_id)
          .eq("is_active", true)
          .neq("id", productData.id)
          .limit(4);

        if (related) {
          const relatedWithImages = await Promise.all(
            related.map(async (p) => {
              const { data: relImgs } = await supabase
                .from("product_images")
                .select("image_url, is_primary")
                .eq("product_id", p.id)
                .eq("is_primary", true)
                .limit(1);
              return { ...p, images: relImgs || [] };
            })
          );
          setRelatedProducts(relatedWithImages);
        }
      }

      // 9. Fetch reviews with user data separately
      const { data: revs } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productData.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (revs) {
        const userIds = [...new Set(revs.map(r => r.user_id).filter(Boolean))];
        let userMap = new Map();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("user_profiles")
            .select("id, full_name, avatar_url")
            .in("id", userIds);
          profiles?.forEach(p => userMap.set(p.id, p));
        }

        const enrichedReviews: Review[] = revs.map(r => ({
          ...r,
          user_name: userMap.get(r.user_id)?.full_name || "Anonymous",
          user_avatar: userMap.get(r.user_id)?.avatar_url || null
        }));
        setReviews(enrichedReviews);
      }

      // 10. Wishlist check
      if (user) {
        const { data: wl } = await supabase
          .from("wishlist")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", productData.id)
          .maybeSingle();
        setIsInWishlist(!!wl);
      }
    } catch (err: any) {
      toast(err.message || "Error loading product", "error");
    } finally {
      setLoading(false);
    }
  }, [productSlug, user, toast]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  // Update current variant when color/size changes
  useEffect(() => {
    if (!variants.length) {
      setCurrentVariant(null);
      return;
    }
    const match = variants.find(v =>
      (selectedColor ? v.color_id === selectedColor.id : !v.color_id) &&
      (selectedSize ? v.size_id === selectedSize.id : !v.size_id)
    );
    setCurrentVariant(match || null);
    setQuantity(1);
    setSelectedImage(0);
  }, [selectedColor, selectedSize, variants]);

  // Real-time subscriptions
  useEffect(() => {
    if (!product?.id) return;
    const channel = supabase
      .channel(`product_${product.id}_rt`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${product.id}` }, (payload) => {
        setProduct((prev: any) => ({ ...prev, ...payload.new }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "product_variants", filter: `product_id=eq.${product.id}` }, () => {
        fetchProduct();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reviews", filter: `product_id=eq.${product.id}` }, () => {
        fetchProduct();
      })
      .subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [product?.id, fetchProduct]);

  // ─── FILTERED IMAGES BY COLOR & VIEW TYPE ───
  const filteredImages = useMemo(() => {
    let imgs = productImages;
    if (selectedColor) {
      imgs = imgs.filter(img => !img.color_id || img.color_id === selectedColor.id);
    }
    if (selectedViewType) {
      imgs = imgs.filter(img => img.view_type === selectedViewType || !img.view_type);
    }
    return imgs.length > 0 ? imgs : productImages;
  }, [productImages, selectedColor, selectedViewType]);

  // ─── AVAILABLE VIEW TYPES FOR SELECTED COLOR ───
  const availableViewTypes = useMemo(() => {
    const types = new Set<string>();
    const imgs = selectedColor 
      ? productImages.filter(img => !img.color_id || img.color_id === selectedColor.id)
      : productImages;
    imgs.forEach(img => {
      if (img.view_type) types.add(img.view_type);
    });
    return Array.from(types);
  }, [productImages, selectedColor]);

  // ─── HELPERS ───
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
  };

  const addToCart = async () => {
    if (!user) { toast("Please sign in to add to cart", "info"); setCurrentView("login"); return; }
    if (!product) return;
    const stock = currentVariant?.stock_quantity ?? product.stock_quantity ?? 0;
    if (stock <= 0) { toast("This product is out of stock", "error"); return; }
    if (quantity > stock) { toast(`Only ${stock} items available`, "error"); return; }

    setAddingToCart(true);
    try {
      let query = supabase.from("cart_items").select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", product.id);

      if (currentVariant) {
        query = query.eq("variant_id", currentVariant.id);
      } else {
        if (selectedColor) query = query.eq("color_id", selectedColor.id);
        else query = query.is("color_id", null);
        if (selectedSize) query = query.eq("size_id", selectedSize.id);
        else query = query.is("size_id", null);
      }

      const { data: existingItem } = await query.maybeSingle();
      let error;
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > stock) {
          toast(`Cannot add more. Only ${stock} in stock.`, "error");
          setAddingToCart(false);
          return;
        }
        ({ error } = await supabase.from("cart_items").update({ quantity: newQty }).eq("id", existingItem.id));
      } else {
        const insertObj: any = {
          user_id: user.id,
          product_id: product.id,
          quantity
        };
        if (currentVariant) {
          insertObj.variant_id = currentVariant.id;
        } else {
          insertObj.color_id = selectedColor?.id || null;
          insertObj.size_id = selectedSize?.id || null;
        }
        ({ error } = await supabase.from("cart_items").insert(insertObj));
      }
      if (error) throw error;
      toast(`Added ${quantity}x ${product.name} to cart!`, "success");
    } catch (err) {
      toast("Error adding to cart", "error");
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleWishlist = async () => {
    if (!user) { toast("Please sign in", "info"); setCurrentView("login"); return; }
    try {
      if (isInWishlist) {
        await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", product.id);
        setIsInWishlist(false);
        toast("Removed from wishlist", "success");
      } else {
        await supabase.from("wishlist").insert({ user_id: user.id, product_id: product.id });
        setIsInWishlist(true);
        toast("Added to wishlist", "success");
      }
    } catch { toast("Error updating wishlist", "error"); }
  };

  const orderViaWhatsApp = () => {
    const message = `Hi Hotshot Fabrics! I want to order:\n\n*Product:* ${product.name}\n*SKU:* ${currentVariant?.sku || product.sku || "N/A"}\n*Price:* R${displayPrice}\n*Quantity:* ${quantity}${selectedColor ? `\n*Color:* ${selectedColor.name}` : ""}${selectedSize ? `\n*Size:* ${selectedSize.name}` : ""}\n\nMy details:\nName: ${profile?.full_name || ""}\nEmail: ${profile?.email || user?.email || ""}\nPhone: ${profile?.phone || ""}`;
    window.open(`https://wa.me/270834160993?text=${encodeURIComponent(message)}`, "_blank");
  };

  const shareProduct = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.short_description, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast("Link copied!", "success");
      }
    } catch {}
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;
    if (!reviewForm.content.trim()) { toast("Please write a review", "error"); return; }
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        product_id: product.id, user_id: user.id,
        rating: reviewForm.rating,
        title: reviewForm.title.trim() || null,
        content: reviewForm.content.trim(),
        is_approved: false
      });
      if (error) throw error;
      toast("Review submitted for approval!", "success");
      setReviewForm({ rating: 5, title: "", content: "" });
    } catch { toast("Error submitting review", "error"); }
    finally { setSubmittingReview(false); }
  };

  const markHelpful = (reviewId: string) => {
    setHelpfulReviews(prev => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  };

  const filteredReviews = useMemo(() => {
    if (reviewFilter === "all") return reviews;
    return reviews.filter(r => r.rating === reviewFilter);
  }, [reviews, reviewFilter]);

  const ratingBreakdown = useMemo(() => {
    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    });
    return breakdown;
  }, [reviews]);

  // ─── DERIVED DATA ───
  if (loading) return <LoadingSkeleton />;
  if (!product) return <NotFound onBack={() => setCurrentView("shop")} />;

  const images = filteredImages;
  const displayPrice = currentVariant?.price ?? product.price;
  const displayCompare = currentVariant?.compare_price ?? product.compare_price;
  const displayStock = currentVariant?.stock_quantity ?? product.stock_quantity ?? 0;
  const outOfStock = displayStock <= 0;
  const lowStock = !outOfStock && displayStock <= 5;
  const discount = displayCompare && displayCompare > displayPrice ? Math.round((1 - displayPrice / displayCompare) * 100) : 0;
  const currentImage = images[selectedImage] || productImages[0];
  const primaryImage = currentImage?.image_url || productImages[0]?.image_url;
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : product.rating || 0;

  return (
    <>
      <Helmet>
        <title>{product.name} | Hotshot Fabrics</title>
        <meta name="description" content={product.short_description || product.description?.slice(0, 160)} />
        <meta property="og:title" content={product.name} />
        <meta property="og:image" content={primaryImage} />
      </Helmet>

      <div className="min-h-screen pt-24 pb-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-6 flex-wrap">
            <button onClick={() => setCurrentView("home")} className="hover:text-white transition-colors">Home</button>
            <ChevronRight className="w-4 h-4" />
            <button onClick={() => setCurrentView("shop")} className="hover:text-white transition-colors">Shop</button>
            {product.category && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button onClick={() => setCurrentView("shop")} className="hover:text-white transition-colors">{product.category.name}</button>
              </>
            )}
            <ChevronRight className="w-4 h-4" />
            <span className="text-white truncate max-w-[200px]">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            {/* ════════════════════════════════════════
                IMAGE GALLERY - WITH COLOR & VIEW TYPE
                ════════════════════════════════════════ */}
            <div className="space-y-4">
              {/* Main Image */}
              <div
                className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-900 cursor-zoom-in group"
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
                onClick={() => currentImage?.image_url && setImageLightbox(currentImage.image_url)}
              >
                {currentImage?.image_url ? (
                  <img
                    src={currentImage.image_url}
                    alt={currentImage.alt_text || product.name}
                    className="w-full h-full object-cover transition-transform duration-300"
                    style={isZoomed ? { transform: "scale(2.2)", transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : {}}
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-24 h-24 text-zinc-700" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                  {discount > 0 && <span className="px-3 py-1 bg-red-500 text-white text-sm font-black rounded-lg">-{discount}%</span>}
                  {product.is_new_arrival && <span className="px-3 py-1 bg-blue-500 text-white text-sm font-black rounded-lg flex items-center gap-1"><Sparkles className="w-3 h-3" /> NEW</span>}
                  {product.is_bestseller && <span className="px-3 py-1 bg-orange-500 text-black text-sm font-black rounded-lg flex items-center gap-1"><TrendingUp className="w-3 h-3" /> BESTSELLER</span>}
                  {outOfStock && <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-sm font-black rounded-lg">SOLD OUT</span>}
                </div>

                {/* View Type Badge */}
                {currentImage?.view_type && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-lg capitalize">
                    {VIEW_TYPE_LABELS[currentImage.view_type] || currentImage.view_type}
                  </div>
                )}

                {!isZoomed && images.length > 0 && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs text-white/60 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-lg">
                    <ZoomIn className="w-3.5 h-3.5" /> Click to enlarge
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(i => Math.max(0, i-1)); }} disabled={selectedImage===0} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center disabled:opacity-0 transition-all">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(i => Math.min(images.length-1, i+1)); }} disabled={selectedImage===images.length-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center disabled:opacity-0 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* View Type Selector */}
              {availableViewTypes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-zinc-500 font-medium">View:</span>
                  <button
                    onClick={() => setSelectedViewType(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      !selectedViewType ? "bg-orange-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  {availableViewTypes.map(vt => (
                    <button
                      key={vt}
                      onClick={() => setSelectedViewType(vt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        selectedViewType === vt ? "bg-orange-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {VIEW_TYPE_LABELS[vt] || vt}
                    </button>
                  ))}
                </div>
              )}

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div ref={imageScrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {images.map((img, i) => (
                    <button 
                      key={img.id || i} 
                      onClick={() => setSelectedImage(i)} 
                      className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all relative ${
                        selectedImage===i ? "border-orange-500 scale-105" : "border-zinc-800 hover:border-zinc-600 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img.image_url} alt={img.alt_text || product.name} className="w-full h-full object-cover" loading="lazy" />
                      {img.view_type && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5 capitalize">
                          {VIEW_TYPE_LABELS[img.view_type] || img.view_type}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════
                PRODUCT INFO
                ════════════════════════════════════════ */}
            <div className="space-y-6">
              <div>
                {product.category && (
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm text-orange-500 font-semibold uppercase tracking-widest mb-2"
                  >
                    {product.category.name}
                  </motion.p>
                )}
                <h1 className="text-3xl lg:text-4xl font-black leading-tight">{product.name}</h1>
                {product.sku && (
                  <p className="text-xs text-zinc-500 mt-1.5 font-mono flex items-center gap-2">
                    SKU: {currentVariant?.sku || product.sku}
                    <button onClick={() => { navigator.clipboard.writeText(currentVariant?.sku || product.sku); toast("SKU copied!", "success"); }}
                      className="p-1 hover:bg-white/10 rounded transition-colors">
                      <Copy className="w-3 h-3" />
                    </button>
                  </p>
                )}

                {/* Rating */}
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? "fill-orange-400 text-orange-400" : "text-zinc-700"}`} />
                    ))}
                  </div>
                  <span className="text-sm text-zinc-400">
                    {avgRating.toFixed(1)} <span className="text-zinc-600">|</span> {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </span>
                  {reviews.length > 0 && (
                    <button onClick={() => setActiveTab("reviews")} className="text-xs text-orange-400 hover:text-orange-300 underline">
                      Read all
                    </button>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-orange-400">R{displayPrice?.toFixed(2)}</span>
                {displayCompare > 0 && (
                  <span className="text-xl text-zinc-500 line-through">R{displayCompare?.toFixed(2)}</span>
                )}
                {discount > 0 && (
                  <span className="px-3 py-1 bg-red-500/15 text-red-400 text-sm font-bold rounded-lg">
                    Save R{(displayCompare - displayPrice).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Short Description */}
              <p className="text-zinc-400 leading-relaxed text-sm">{product.short_description || product.description?.slice(0, 200)}</p>

              {/* Material Tag */}
              {product.material && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Tag className="w-4 h-4 text-orange-500" />
                  <span>Material: <span className="text-zinc-300">{product.material}</span></span>
                </div>
              )}

              {/* ═══ COLOR SELECTOR ═══ */}
              {colorObjects.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-sm">
                      Color: <span className="text-zinc-400 font-normal">{selectedColor ? selectedColor.name : "Select a color"}</span>
                    </p>
                    {selectedColor && (
                      <button onClick={() => { setSelectedColor(null); setSelectedViewType(null); }} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {colorObjects.map((color) => {
                      const isSelected = selectedColor?.id === color.id;
                      const hasImages = productImages.some(img => img.color_id === color.id);
                      return (
                        <button
                          key={color.id}
                          onClick={() => {
                            setSelectedColor(isSelected ? null : color);
                            setSelectedViewType(null);
                            setSelectedImage(0);
                          }}
                          title={color.name}
                          className={`group relative w-12 h-12 rounded-full border-[3px] transition-all duration-200 ${
                            isSelected 
                              ? "border-orange-500 scale-110 shadow-lg shadow-orange-500/30" 
                              : "border-zinc-700 hover:border-zinc-400 hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.hex_code }}
                        >
                          {isSelected && (
                            <Check className="w-5 h-5 absolute inset-0 m-auto drop-shadow-md" style={{ color: isLightColor(color.hex_code) ? "#000" : "#fff" }} />
                          )}
                          {hasImages && !isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                              <Camera className="w-2.5 h-2.5 text-black" />
                            </div>
                          )}
                          <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-zinc-800 px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                            {color.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ═══ SIZE SELECTOR ═══ */}
              {sizeObjects.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-sm">
                      Size: <span className="text-zinc-400 font-normal">{selectedSize ? selectedSize.name : "Select a size"}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowSizeGuide(true)} className="text-xs text-orange-400 hover:text-orange-300 underline">
                        Size Guide
                      </button>
                      {selectedSize && (
                        <button onClick={() => setSelectedSize(null)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizeObjects.map((size) => {
                      const isSelected = selectedSize?.id === size.id;
                      const variantForSize = variants.find(v => 
                        v.size_id === size.id && 
                        (!selectedColor || v.color_id === selectedColor.id)
                      );
                      const isOutOfStock = variantForSize ? variantForSize.stock_quantity <= 0 : false;

                      return (
                        <button
                          key={size.id}
                          onClick={() => setSelectedSize(isSelected ? null : size)}
                          disabled={isOutOfStock}
                          className={`min-w-[56px] px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                            isSelected 
                              ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-lg" 
                              : isOutOfStock 
                                ? "border-zinc-800 text-zinc-700 cursor-not-allowed opacity-50 line-through"
                                : "border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          {size.name}
                          {isOutOfStock && <span className="block text-[9px] font-normal">Out</span>}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Stock Status */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
                  outOfStock 
                    ? "bg-red-500/5 border-red-500/20 text-red-400" 
                    : lowStock 
                      ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-400" 
                      : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                }`}
              >
                {outOfStock ? (
                  <><X className="w-4 h-4" /> Out of Stock</>
                ) : lowStock ? (
                  <><AlertTriangle className="w-4 h-4" /> Only {displayStock} left — order soon!</>
                ) : (
                  <><Check className="w-4 h-4" /> In Stock ({displayStock} available)</>
                )}
              </motion.div>

              {/* Quantity & Actions */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900">
                    <button onClick={() => setQuantity(Math.max(1, quantity-1))} className="px-4 py-3 hover:bg-white/5 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-14 text-center font-black text-lg">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(displayStock, quantity+1))} disabled={quantity >= displayStock || outOfStock} 
                      className="px-4 py-3 hover:bg-white/5 disabled:opacity-30 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <motion.button 
                    whileHover={{ scale: outOfStock ? 1 : 1.02 }} 
                    whileTap={{ scale: outOfStock ? 1 : 0.98 }} 
                    onClick={addToCart} 
                    disabled={addingToCart || outOfStock}
                    className="flex-1 min-w-0 sm:min-w-[180px] py-3 bg-gradient-to-r from-orange-500 to-orange-600 disabled:from-zinc-800 disabled:to-zinc-800 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:shadow-none transition-all"
                  >
                    {addingToCart ? <Loader2 className="w-5 h-5 animate-spin" /> : outOfStock ? "Out of Stock" : <><ShoppingBag className="w-5 h-5" /> Add to Cart</>}
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={toggleWishlist}
                    className={`p-3.5 rounded-xl border-2 transition-all ${
                      isInWishlist 
                        ? "border-red-500 bg-red-500/10 text-red-400" 
                        : "border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isInWishlist ? "fill-current" : ""}`} />
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={shareProduct}
                    className="p-3.5 rounded-xl border-2 border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
                  </motion.button>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }} 
                  onClick={orderViaWhatsApp}
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#1ebe5d] rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 text-black transition-colors"
                >
                  <MessageCircle className="w-5 h-5" /> Order via WhatsApp
                </motion.button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800/50">
                {[
                  { icon: Truck, label: "Free Shipping", sub: "Over R1,500" },
                  { icon: Shield, label: "Secure Checkout", sub: "SSL Encrypted" },
                  { icon: RotateCcw, label: "Easy Returns", sub: "30-day policy" }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center gap-1.5 p-3 bg-zinc-900/40 rounded-xl">
                    <item.icon className="w-5 h-5 text-orange-500" />
                    <span className="text-xs font-semibold">{item.label}</span>
                    <span className="text-[10px] text-zinc-500">{item.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
              TABS: Description | Reviews | Shipping
              ════════════════════════════════════════ */}
          <div className="mt-16">
            <div className="flex gap-6 border-b border-zinc-800 mb-8 overflow-x-auto scrollbar-hide pb-1">
              {([
                { key: "description" as const, label: "Description" },
                { key: "reviews" as const, label: `Reviews (${reviews.length})` },
                { key: "shipping" as const, label: "Shipping & Returns" }
              ]).map(tab => (
                <button 
                  key={tab.key} 
                  onClick={() => setActiveTab(tab.key)} 
                  className={`pb-4 text-sm font-bold uppercase tracking-wider relative whitespace-nowrap transition-colors ${
                    activeTab === tab.key ? "text-orange-400" : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-orange-400 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab} 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -8 }} 
                transition={{ duration: 0.2 }}
              >
                {activeTab === "description" && (
                  <DescriptionTab 
                    product={product} 
                    colorObjects={colorObjects}
                    sizeObjects={sizeObjects}
                    material={product.material}
                    careInstructions={product.care_instructions}
                  />
                )}
                {activeTab === "reviews" && (
                  <ReviewsTab 
                    reviews={filteredReviews}
                    allReviews={reviews}
                    avgRating={avgRating}
                    ratingBreakdown={ratingBreakdown}
                    user={user}
                    reviewForm={reviewForm}
                    setReviewForm={setReviewForm}
                    submittingReview={submittingReview}
                    submitReview={submitReview}
                    setCurrentView={setCurrentView}
                    reviewFilter={reviewFilter}
                    setReviewFilter={setReviewFilter}
                    helpfulReviews={helpfulReviews}
                    markHelpful={markHelpful}
                  />
                )}
                {activeTab === "shipping" && <ShippingTab />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <RelatedProducts 
              products={relatedProducts} 
              setCurrentView={setCurrentView} 
              setViewParams={setViewParams} 
            />
          )}
        </div>
      </div>

      {/* ═══ LIGHTBOX MODAL ═══ */}
      <AnimatePresence>
        {imageLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setImageLightbox(null)}
          >
            <button 
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              onClick={() => setImageLightbox(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={imageLightbox} 
              alt="Product" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SIZE GUIDE MODAL ═══ */}
      <AnimatePresence>
        {showSizeGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSizeGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Size Guide</h3>
                <button onClick={() => setShowSizeGuide(false)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left p-3 text-zinc-400 font-medium">Size</th>
                      <th className="text-left p-3 text-zinc-400 font-medium">Chest (cm)</th>
                      <th className="text-left p-3 text-zinc-400 font-medium">Waist (cm)</th>
                      <th className="text-left p-3 text-zinc-400 font-medium">Length (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { size: "XS", chest: "84-88", waist: "68-72", length: "66" },
                      { size: "S", chest: "88-92", waist: "72-76", length: "68" },
                      { size: "M", chest: "92-96", waist: "76-80", length: "70" },
                      { size: "L", chest: "96-100", waist: "80-84", length: "72" },
                      { size: "XL", chest: "100-104", waist: "84-88", length: "74" },
                      { size: "2XL", chest: "104-108", waist: "88-92", length: "76" },
                      { size: "3XL", chest: "108-112", waist: "92-96", length: "78" },
                    ].map((row) => (
                      <tr key={row.size} className="border-b border-zinc-800/50 hover:bg-white/5">
                        <td className="p-3 font-bold">{row.size}</td>
                        <td className="p-3 text-zinc-400">{row.chest}</td>
                        <td className="p-3 text-zinc-400">{row.waist}</td>
                        <td className="p-3 text-zinc-400">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-500 mt-4 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Measurements may vary slightly by product. Check product details for specific sizing.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════
// DESCRIPTION TAB
// ═══════════════════════════════════════════════════
function DescriptionTab({ 
  product, 
  colorObjects, 
  sizeObjects,
  material,
  careInstructions 
}: { 
  product: any; 
  colorObjects: ColorOption[];
  sizeObjects: SizeOption[];
  material?: string;
  careInstructions?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const description = product.description || "No detailed description available.";
  const shouldTruncate = description.length > 400;

  return (
    <div className="space-y-8">
      {/* Main Description */}
      <div>
        <h3 className="text-lg font-bold mb-4">About This Product</h3>
        <div className={`text-zinc-400 leading-relaxed text-sm whitespace-pre-line ${!expanded && shouldTruncate ? "line-clamp-6" : ""}`}>
          {description}
        </div>
        {shouldTruncate && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 transition-colors"
          >
            {expanded ? "Show Less" : "Read More"} <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Package, title: "Premium Quality", desc: "Crafted with attention to detail and durability in mind." },
          { icon: Sparkles, title: "Stylish Design", desc: "Modern aesthetic that complements any wardrobe." },
          { icon: Shield, title: "Long Lasting", desc: "Built to withstand daily wear and frequent washing." },
          { icon: Truck, title: "Fast Delivery", desc: "Shipped within 24-48 hours of order confirmation." },
          { icon: RotateCcw, title: "Easy Returns", desc: "30-day hassle-free return policy for peace of mind." },
          { icon: Heart, title: "Customer Favorite", desc: "Loved by thousands of satisfied customers." },
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
          >
            <feature.icon className="w-6 h-6 text-orange-500 mb-2" />
            <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
            <p className="text-xs text-zinc-500">{feature.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Product Specs */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Product Specifications</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {material && (
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Material</p>
                <p className="text-sm text-zinc-300">{material}</p>
              </div>
            </div>
          )}
          {product.weight && (
            <div className="flex items-start gap-3">
              <Package className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Weight</p>
                <p className="text-sm text-zinc-300">{product.weight} kg</p>
              </div>
            </div>
          )}
          {careInstructions && (
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Care Instructions</p>
                <p className="text-sm text-zinc-300">{careInstructions}</p>
              </div>
            </div>
          )}
          {product.sku && (
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">SKU</p>
                <p className="text-sm font-mono text-zinc-300">{product.sku}</p>
              </div>
            </div>
          )}
          {colorObjects.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full border border-zinc-600 mt-0.5" style={{ background: `linear-gradient(135deg, ${colorObjects.slice(0,3).map(c => c.hex_code).join(", ")})` }} />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Available Colors</p>
                <div className="flex gap-1 mt-1">
                  {colorObjects.map(c => (
                    <div key={c.id} className="w-4 h-4 rounded-full border border-zinc-700" style={{ backgroundColor: c.hex_code }} title={c.name} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {sizeObjects.length > 0 && (
            <div className="flex items-start gap-3">
              <RulerIcon className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Available Sizes</p>
                <p className="text-sm text-zinc-300">{sizeObjects.map(s => s.name).join(", ")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// REVIEWS TAB - FULLY FEATURED
// ═══════════════════════════════════════════════════
function ReviewsTab({
  reviews,
  allReviews,
  avgRating,
  ratingBreakdown,
  user,
  reviewForm,
  setReviewForm,
  submittingReview,
  submitReview,
  setCurrentView,
  reviewFilter,
  setReviewFilter,
  helpfulReviews,
  markHelpful
}: {
  reviews: Review[];
  allReviews: Review[];
  avgRating: number;
  ratingBreakdown: Record<number, number>;
  user: any;
  reviewForm: { rating: number; title: string; content: string };
  setReviewForm: React.Dispatch<React.SetStateAction<{ rating: number; title: string; content: string }>>;
  submittingReview: boolean;
  submitReview: (e: React.FormEvent) => Promise<void>;
  setCurrentView: (view: any) => void;
  reviewFilter: "all" | 5 | 4 | 3 | 2 | 1;
  setReviewFilter: (f: "all" | 5 | 4 | 3 | 2 | 1) => void;
  helpfulReviews: Set<string>;
  markHelpful: (id: string) => void;
}) {
  const totalReviews = allReviews.length;
  const maxBreakdown = Math.max(...Object.values(ratingBreakdown), 1);

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Rating */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-5xl font-black text-orange-400">{avgRating.toFixed(1)}</p>
          <div className="flex justify-center gap-0.5 my-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-5 h-5 ${i < Math.round(avgRating) ? "fill-orange-400 text-orange-400" : "text-zinc-700"}`} />
            ))}
          </div>
          <p className="text-sm text-zinc-500">Based on {totalReviews} review{totalReviews !== 1 ? "s" : ""}</p>
        </div>

        {/* Rating Breakdown */}
        <div className="md:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h4 className="font-semibold mb-4">Rating Breakdown</h4>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingBreakdown[stars] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <button
                  key={stars}
                  onClick={() => setReviewFilter(reviewFilter === stars ? "all" : stars as any)}
                  className={`w-full flex items-center gap-3 group transition-colors rounded-lg px-2 py-1 ${
                    reviewFilter === stars ? "bg-orange-500/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="text-sm font-medium w-8">{stars}★</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="h-full bg-orange-500 rounded-full"
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-10 text-right">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-500">Filter:</span>
        {(["all", 5, 4, 3, 2, 1] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setReviewFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              reviewFilter === filter
                ? "bg-orange-500 text-black"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            {filter === "all" ? "All Reviews" : `${filter} Stars`}
          </button>
        ))}
      </div>

      {/* Write Review Form */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h4 className="font-bold mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-orange-500" />
          Write a Review
        </h4>

        {user ? (
          <form onSubmit={submitReview} className="space-y-4">
            {/* Star Rating */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Your Rating</label>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReviewForm(prev => ({ ...prev, rating: i + 1 }))}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star className={`w-7 h-7 transition-colors ${
                      i < reviewForm.rating ? "fill-orange-400 text-orange-400" : "text-zinc-700 hover:text-zinc-500"
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Review Title (optional)</label>
              <input
                type="text"
                value={reviewForm.title}
                onChange={e => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Summarize your experience"
                className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all text-sm"
              />
            </div>

            {/* Content */}
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Your Review *</label>
              <textarea
                rows={4}
                value={reviewForm.content}
                onChange={e => setReviewForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="What did you like or dislike? How was the fit and quality?"
                className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 resize-none transition-all text-sm"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">Your review will be posted after admin approval.</p>
              <button
                type="submit"
                disabled={submittingReview}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Review</>}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6">
            <User className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 mb-3">Sign in to write a review</p>
            <button
              onClick={() => setCurrentView("login")}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm text-black transition-colors"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800">
            <MessageCircle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-500">
              Showing {reviews.length} of {allReviews.length} reviews
              {reviewFilter !== "all" && ` - ${reviewFilter} stars`}
            </p>
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                      {review.user_avatar ? (
                        <img src={review.user_avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <span className="font-bold text-sm text-black">
                          {review.user_name?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{review.user_name || "Anonymous"}</p>
                      <p className="text-xs text-zinc-500">{new Date(review.created_at).toLocaleDateString("en-ZA", { dateStyle: "medium" })}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className={`w-4 h-4 ${s < review.rating ? "fill-orange-400 text-orange-400" : "text-zinc-700"}`} />
                    ))}
                  </div>
                </div>

                {review.title && <p className="font-semibold text-sm mb-1">{review.title}</p>}
                <p className="text-sm text-zinc-400 leading-relaxed">{review.content}</p>

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800/50">
                  <button
                    onClick={() => markHelpful(review.id)}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      helpfulReviews.has(review.id) ? "text-orange-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${helpfulReviews.has(review.id) ? "fill-current" : ""}`} />
                    Helpful ({(review.helpful_count || 0) + (helpfulReviews.has(review.id) ? 1 : 0)})
                  </button>
                  <span className="text-xs text-zinc-600">Verified Purchase</span>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SHIPPING TAB
// ═══════════════════════════════════════════════════
function ShippingTab() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "How long does delivery take?", a: "Standard delivery takes 3-5 business days within South Africa. Express delivery (1-2 business days) is available for select areas." },
    { q: "What are the shipping costs?", a: "Free shipping on all orders over R1,500. Orders below R1,500 have a flat rate of R75 for standard delivery." },
    { q: "Do you ship internationally?", a: "Currently we only ship within South Africa. International shipping coming soon!" },
    { q: "How do I track my order?", a: "Once your order ships, you will receive an email with a tracking number and link to track your package in real-time." },
    { q: "What is your return policy?", a: "We offer a 30-day hassle-free return policy. Items must be unworn, unwashed, and in original packaging with tags attached." },
    { q: "How do I initiate a return?", a: "Contact our support team via WhatsApp or email. We will arrange a pickup or provide a return shipping label." },
  ];

  return (
    <div className="space-y-8">
      {/* Shipping Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Truck, title: "Standard Delivery", desc: "3-5 business days", price: "R75 or FREE over R1,500" },
          { icon: Zap, title: "Express Delivery", desc: "1-2 business days", price: "R150" },
          { icon: MapPin, title: "Coverage", desc: "Nationwide", price: "All provinces in SA" },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-center hover:border-zinc-700 transition-colors"
          >
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <item.icon className="w-6 h-6 text-orange-500" />
            </div>
            <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
            <p className="text-xs text-zinc-400 mb-1">{item.desc}</p>
            <p className="text-xs text-orange-400 font-medium">{item.price}</p>
          </motion.div>
        ))}
      </div>

      {/* Return Policy */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-orange-500" />
          Return & Exchange Policy
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Clock, title: "30-Day Window", desc: "Return any item within 30 days of delivery for a full refund." },
            { icon: Package, title: "Original Condition", desc: "Items must be unworn, unwashed, with original tags attached." },
            { icon: CreditCard, title: "Refund Method", desc: "Refunds processed to original payment method within 5-7 business days." },
            { icon: Truck, title: "Free Returns", desc: "We cover return shipping for defective or incorrect items." },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <item.icon className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-zinc-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-medium text-sm">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="px-4 pb-4 text-sm text-zinc-400">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// RELATED PRODUCTS
// ═══════════════════════════════════════════════════
function RelatedProducts({ products, setCurrentView, setViewParams }: {
  products: RelatedProduct[];
  setCurrentView: (view: any) => void;
  setViewParams: (params: any) => void;
}) {
  return (
    <div className="mt-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black">You May Also Like</h2>
        <button 
          onClick={() => setCurrentView("shop")}
          className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
        >
          View All <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product, i) => {
          const discount = product.compare_price && product.compare_price > product.price
            ? Math.round((1 - product.price / product.compare_price) * 100)
            : 0;

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => { setViewParams({ slug: product.slug }); setCurrentView("product"); }}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer group hover:border-zinc-700 transition-all"
            >
              <div className="relative aspect-square bg-zinc-800 overflow-hidden">
                <img 
                  src={product.images?.[0]?.image_url || "https://via.placeholder.com/300"} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {discount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">-{discount}%</span>
                  )}
                  {product.is_new_arrival && (
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">NEW</span>
                  )}
                  {product.is_bestseller && (
                    <span className="px-2 py-0.5 bg-orange-500 text-black text-[10px] font-bold rounded">BEST</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="font-semibold text-sm truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-orange-400 text-sm">R{product.price?.toFixed(2)}</span>
                  {product.compare_price && (
                    <span className="text-xs text-zinc-500 line-through">R{product.compare_price?.toFixed(2)}</span>
                  )}
                </div>
                {product.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                    <span className="text-xs text-zinc-500">{product.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════
function LoadingSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          <div className="space-y-4">
            <div className="aspect-[4/5] bg-zinc-900 rounded-2xl animate-pulse" />
            <div className="flex gap-2">
              {[1,2,3,4].map(i => <div key={i} className="w-20 h-20 bg-zinc-900 rounded-xl animate-pulse" />)}
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-4 bg-zinc-900 rounded w-1/4 animate-pulse" />
            <div className="h-10 bg-zinc-900 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-zinc-900 rounded w-1/3 animate-pulse" />
            <div className="h-20 bg-zinc-900 rounded animate-pulse" />
            <div className="h-12 bg-zinc-900 rounded w-1/2 animate-pulse" />
            <div className="h-12 bg-zinc-900 rounded w-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// NOT FOUND
// ═══════════════════════════════════════════════════
function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
      <div className="text-center">
        <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <p className="text-zinc-500 mb-6">The product you are looking for does not exist or has been removed.</p>
        <button 
          onClick={onBack}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-black transition-colors"
        >
          Back to Shop
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// UTILITY: Check if color is light
// ═══════════════════════════════════════════════════
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

// ═══════════════════════════════════════════════════
// RulerIcon helper (since Ruler might not exist in lucide)
// ═══════════════════════════════════════════════════
function RulerIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
      <path d="m14.5 12.5 2-2" />
      <path d="m11.5 9.5 2-2" />
      <path d="m8.5 6.5 2-2" />
      <path d="m17.5 15.5 2-2" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════
// PaletteIcon helper
// ═══════════════════════════════════════════════════
function PaletteIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.01 17.461 2 12 2z" />
    </svg>
  );
}