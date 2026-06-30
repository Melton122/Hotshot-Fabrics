// ============================================
// HOTSHOT FABRICS - ADMIN REVIEWS
// Works WITHOUT foreign keys - fetches data separately
// ============================================
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import {
  Star, CheckCircle, XCircle, MessageSquare, RefreshCw,
  Search, Eye, Trash2, Package, X, User
} from "lucide-react";
import { ConfirmModal } from "../../components/ConfirmDialog";

interface Review {
  id: string;
  product_id: string | null;
  user_id: string | null;
  title: string;
  content: string;
  rating: number;
  is_approved: boolean;
  created_at: string;
  // Joined data
  product_name?: string;
  product_slug?: string;
  user_name?: string;
  user_avatar?: string;
}

export function AdminReviews() {
  const { toast } = useApp();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Cache for products and users to avoid repeated fetches
  const productsCache = useRef<Map<string, { name: string; slug: string }>>(new Map());
  const usersCache = useRef<Map<string, { full_name: string; avatar_url: string }>>(new Map());

  const fetchReviews = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Step 1: Fetch reviews WITHOUT any joins
      let query = supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "pending") query = query.eq("is_approved", false);
      if (filter === "approved") query = query.eq("is_approved", true);
      if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);

      const { data: reviewsData, error: reviewsError } = await query;
      if (reviewsError) throw reviewsError;
      if (!reviewsData) {
        setReviews([]);
        return;
      }

      // Step 2: Collect unique IDs we need to look up
      const productIds = [...new Set(reviewsData.map(r => r.product_id).filter(Boolean))];
      const userIds = [...new Set(reviewsData.map(r => r.user_id).filter(Boolean))];

      // Step 3: Fetch products separately (only new ones not in cache)
      const uncachedProductIds = productIds.filter(id => !productsCache.current.has(id));
      if (uncachedProductIds.length > 0) {
        const { data: productsData } = await supabase
          .from("products")
          .select("id, name, slug")
          .in("id", uncachedProductIds);
        
        productsData?.forEach(p => productsCache.current.set(p.id, { name: p.name, slug: p.slug }));
      }

      // Step 4: Fetch user profiles separately (only new ones not in cache)
      const uncachedUserIds = userIds.filter(id => !usersCache.current.has(id));
      if (uncachedUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from("user_profiles")
          .select("id, full_name, avatar_url")
          .in("id", uncachedUserIds);
        
        usersData?.forEach(u => usersCache.current.set(u.id, { full_name: u.full_name, avatar_url: u.avatar_url }));
      }

      // Step 5: Merge everything together
      const enrichedReviews: Review[] = reviewsData.map(review => ({
        ...review,
        product_name: review.product_id ? productsCache.current.get(review.product_id)?.name : undefined,
        product_slug: review.product_id ? productsCache.current.get(review.product_id)?.slug : undefined,
        user_name: review.user_id ? usersCache.current.get(review.user_id)?.full_name : undefined,
        user_avatar: review.user_id ? usersCache.current.get(review.user_id)?.avatar_url : undefined,
      }));

      setReviews(enrichedReviews);
    } catch (err: any) {
      toast(err.message || "Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-reviews-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, (payload) => {
        fetchReviews(false);
        if (payload.eventType === "INSERT") {
          toast("New review received", "info");
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchReviews, toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchReviews();
    setIsRefreshing(false);
    toast("Reviews refreshed", "success");
  };

  const toggleApproval = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from("reviews").update({ is_approved: !current }).eq("id", id);
      if (error) throw error;
      toast(`Review ${!current ? "approved" : "unapproved"}`, "success");
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: !current } : r));
    } catch (err: any) {
      toast(err.message || "Error updating review", "error");
    }
  };

  const deleteReview = async (id: string) => {
    try {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
      toast("Review deleted", "success");
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      toast(err.message || "Error deleting review", "error");
    }
  };

  const viewReviewDetail = (review: Review) => {
    setSelectedReview(review);
    setShowDetail(true);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black">Reviews</h1>
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>
          </div>
          <p className="text-zinc-400 mt-1">{reviews.length} total reviews</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleRefresh} disabled={isRefreshing} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-all disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 text-zinc-400 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input type="text" placeholder="Search reviews..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === "Enter" && fetchReviews()}
              className="pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 w-56 transition-colors" />
          </div>

          <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
            {(["all", "pending", "approved"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  filter === f ? "bg-orange-500 text-black font-bold" : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-zinc-900/50 rounded-2xl animate-pulse" />
          ))
        ) : reviews.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No reviews found</p>
          </div>
        ) : (
          reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
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
                    <p className="text-xs text-zinc-500">{new Date(review.created_at).toLocaleDateString("en-ZA")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className={`w-4 h-4 ${s < review.rating ? "fill-orange-400 text-orange-400" : "text-zinc-700"}`} />
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium mb-1">{review.title}</p>
                <p className="text-sm text-zinc-400 line-clamp-2">{review.content}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium border ${
                    review.is_approved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  }`}>
                    {review.is_approved ? "Approved" : "Pending"}
                  </span>
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Package className="w-3 h-3" /> {review.product_name || "Unknown Product"}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleApproval(review.id, review.is_approved)}
                    className={`p-2 rounded-xl transition-colors ${
                      review.is_approved ? "hover:bg-yellow-500/10 hover:text-yellow-400" : "hover:bg-emerald-500/10 hover:text-emerald-400"
                    }`}>
                    {review.is_approved ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button onClick={() => viewReviewDetail(review)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm(review.id)} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Review Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedReview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowDetail(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto my-8">
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
                <h2 className="text-xl font-bold">Review Detail</h2>
                <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <span className="font-bold text-lg text-black">{selectedReview.user_name?.[0]?.toUpperCase() || "?"}</span>
                  </div>
                  <div>
                    <p className="font-bold">{selectedReview.user_name || "Anonymous"}</p>
                    <p className="text-sm text-zinc-500">{new Date(selectedReview.created_at).toLocaleDateString("en-ZA", { dateStyle: "long" })}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className={`w-5 h-5 ${s < selectedReview.rating ? "fill-orange-400 text-orange-400" : "text-zinc-700"}`} />
                  ))}
                </div>
                <div>
                  <p className="font-semibold mb-2">{selectedReview.title}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{selectedReview.content}</p>
                </div>
                <div className="bg-zinc-800/30 rounded-xl p-4">
                  <p className="text-sm font-medium mb-1 flex items-center gap-2"><Package className="w-4 h-4 text-orange-500" /> Product</p>
                  <p className="text-sm text-zinc-400">{selectedReview.product_name || "Unknown Product"}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => { if (deleteConfirm) deleteReview(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}