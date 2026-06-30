import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import { 
  Package, ChevronRight, Clock, CheckCircle, Truck, Box, 
  Loader2, AlertTriangle, Search, SlidersHorizontal, X,
  MessageCircle, Mail, Eye, TrendingUp, Calendar, Hash,
  ArrowUpDown, Filter, Receipt, ShoppingBag, Phone, Navigation,
  Ban, Star, CreditCard, ImageIcon
} from "lucide-react";

const statusConfig: Record<string, { 
  color: string; 
  icon: any; 
  label: string; 
  bg: string;
  border: string;
  glow: string;
}> = {
  pending: { 
    color: "text-yellow-400", 
    bg: "bg-yellow-500/10", 
    border: "border-yellow-500/20",
    glow: "shadow-yellow-500/5",
    icon: Clock, 
    label: "Pending" 
  },
  confirmed: { 
    color: "text-blue-400", 
    bg: "bg-blue-500/10", 
    border: "border-blue-500/20",
    glow: "shadow-blue-500/5",
    icon: CheckCircle, 
    label: "Confirmed" 
  },
  preparing: { 
    color: "text-orange-400", 
    bg: "bg-orange-500/10", 
    border: "border-orange-500/20",
    glow: "shadow-orange-500/5",
    icon: Box, 
    label: "Preparing" 
  },
  ready_for_delivery: { 
    color: "text-purple-400", 
    bg: "bg-purple-500/10", 
    border: "border-purple-500/20",
    glow: "shadow-purple-500/5",
    icon: Package, 
    label: "Ready" 
  },
  out_for_delivery: { 
    color: "text-cyan-400", 
    bg: "bg-cyan-500/10", 
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/5",
    icon: Truck, 
    label: "Out for Delivery" 
  },
  delivered: { 
    color: "text-emerald-400", 
    bg: "bg-emerald-500/10", 
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/5",
    icon: CheckCircle, 
    label: "Delivered" 
  },
  cancelled: { 
    color: "text-red-400", 
    bg: "bg-red-500/10", 
    border: "border-red-500/20",
    glow: "shadow-red-500/5",
    icon: Ban, 
    label: "Cancelled" 
  },
  returned: { 
    color: "text-zinc-400", 
    bg: "bg-zinc-500/10", 
    border: "border-zinc-500/20",
    glow: "shadow-zinc-500/5",
    icon: Box, 
    label: "Returned" 
  }
};

export function OrdersPage() {
  const { user, setCurrentView, setViewParams } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "total">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const itemsPerPage = 10;
  const channelRef = useRef<any>(null);

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/storage')) {
      const { data } = supabase.storage.from('products').getPublicUrl(imagePath);
      return data.publicUrl;
    }
    return imagePath;
  };

  const fetchOrders = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // First fetch orders
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("user_id", user.id);

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      if (searchQuery) {
        query = query.or(`order_number.ilike.%${searchQuery}%,shipping_address->>full_name.ilike.%${searchQuery}%`);
      }

      if (sortBy === "date") {
        query = query.order("created_at", { ascending: sortOrder === "asc" });
      } else {
        query = query.order("total", { ascending: sortOrder === "asc" });
      }

      const { data: ordersData, error: ordersError, count } = await query
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (ordersError) throw ordersError;
      
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setTotalCount(count || 0);
        setLoading(false);
        return;
      }

      // Fetch items for each order
      const orderIds = ordersData.map(order => order.id);
      const { data: allItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);
      
      // Group items by order_id
      const itemsByOrder = new Map();
      if (allItems) {
        allItems.forEach(item => {
          if (!itemsByOrder.has(item.order_id)) {
            itemsByOrder.set(item.order_id, []);
          }
          itemsByOrder.get(item.order_id).push(item);
        });
      }
      
      // Merge items into orders
      const ordersWithItems = ordersData.map(order => ({
        ...order,
        items: itemsByOrder.get(order.id) || []
      }));

      setOrders(ordersWithItems);
      setTotalCount(count || 0);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [user, page, statusFilter, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1);
        fetchOrders();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchOrders]);

  // Real-time subscription for orders
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`orders_${user.id}_realtime`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, fetchOrders)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items" }, fetchOrders)
      .subscribe();
    channelRef.current = channel;

    return () => { channel.unsubscribe(); };
  }, [user, fetchOrders]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const stats = {
    total: totalCount,
    active: orders.filter(o => !["delivered", "cancelled", "returned"].includes(o.status)).length,
    delivered: orders.filter(o => o.status === "delivered").length,
    totalSpent: orders.reduce((sum, o) => sum + (o.total || 0), 0)
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Please sign in</h2>
          <p className="text-zinc-400 mb-6">Sign in to view your order history</p>
          <button onClick={() => setCurrentView("login")} className="px-6 py-2.5 bg-orange-500 rounded-xl font-bold hover:bg-orange-600 transition-colors">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">My Orders</h1>
            <p className="text-zinc-400 mt-1">Track and manage your purchases</p>
          </div>

          {/* Stats Row */}
          <div className="flex gap-3 flex-wrap">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-500" />
              <span className="text-sm"><span className="font-bold">{stats.total}</span> <span className="text-zinc-400">orders</span></span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm"><span className="font-bold">R{stats.totalSpent.toFixed(2)}</span> <span className="text-zinc-400">spent</span></span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm"><span className="font-bold">{stats.active}</span> <span className="text-zinc-400">active</span></span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by order number or customer name..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-zinc-500 hover:text-white" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors border ${
              showFilters ? "bg-orange-500 border-orange-500 text-white" : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
          <button
            onClick={() => {
              setSortOrder(prev => prev === "desc" ? "asc" : "desc");
              setPage(1);
            }}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium flex items-center gap-2 hover:border-zinc-600 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" /> {sortOrder === "desc" ? "Newest" : "Oldest"}
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Filter className="w-4 h-4 text-orange-500" /> Status Filter
                  </p>
                  {statusFilter && (
                    <button 
                      onClick={() => { setStatusFilter(""); setPage(1); }}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { setStatusFilter(""); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      !statusFilter ? "bg-orange-500 text-white" : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => { setStatusFilter(key); setPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        statusFilter === key 
                          ? `${config.bg} ${config.color} border ${config.border}` 
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      <config.icon className="w-3.5 h-3.5" />
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <Package className="w-10 h-10 text-zinc-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">No orders found</h2>
            <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
              {searchQuery || statusFilter 
                ? "Try adjusting your filters to see more results" 
                : "Start shopping to see your orders here"}
            </p>
            <button 
              onClick={() => {
                if (searchQuery || statusFilter) {
                  setSearchQuery("");
                  setStatusFilter("");
                  setPage(1);
                } else {
                  setCurrentView("shop");
                }
              }} 
              className="px-6 py-2.5 bg-orange-500 rounded-xl font-bold hover:bg-orange-600 transition-colors"
            >
              {searchQuery || statusFilter ? "Clear Filters" : "Shop Now"}
            </button>
          </motion.div>
        ) : (
          <>
            <div className="space-y-4">
              {orders.map((order, i) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                const itemCount = order.items?.length || 0;
                const isActive = !["delivered", "cancelled", "returned"].includes(order.status);
                const firstItem = order.items?.[0];

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`bg-zinc-900 border ${isActive ? "border-zinc-700 hover:border-orange-500/30" : "border-zinc-800 hover:border-zinc-700"} rounded-2xl p-5 transition-all cursor-pointer group ${isActive ? status.glow : ""}`}
                    onClick={() => setCurrentView("order-detail", { orderId: order.id })}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
                          <StatusIcon className={`w-5 h-5 ${status.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">Order #{order.order_number}</p>
                            {isActive && (
                              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleDateString("en-ZA", { dateStyle: "medium" })}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${status.bg} ${status.color} border ${status.border}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">{status.label}</span>
                      </div>
                    </div>

                    {/* Product Info Preview */}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-800/50 rounded-xl">
                      {firstItem?.product_image ? (
                        <img 
                          src={getImageUrl(firstItem.product_image) || "/placeholder-product.png"} 
                          alt={firstItem.product_name} 
                          className="w-14 h-14 rounded-lg object-cover ring-1 ring-zinc-700"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.png"; }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center ring-1 ring-zinc-700">
                          <ShoppingBag className="w-6 h-6 text-zinc-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{firstItem?.product_name || "Product"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {firstItem?.color_name && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 rounded text-purple-400 border border-purple-500/20">{firstItem.color_name}</span>
                          )}
                          {firstItem?.size_name && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 rounded text-blue-400 border border-blue-500/20">{firstItem.size_name}</span>
                          )}
                          {itemCount > 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500">+{itemCount - 1} more</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-bold text-lg">R{(order.total || 0).toFixed(2)}</p>
                          <p className="text-xs text-zinc-500">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                        </div>
                        {order.tracking_number && (
                          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-lg">
                            <Navigation className="w-3 h-3" />
                            {order.delivery_service || "Tracking available"}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-orange-400 font-medium group-hover:underline">View Details</span>
                        <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm disabled:opacity-50 hover:border-zinc-600 transition-colors font-medium"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                          page === pageNum 
                            ? "bg-orange-500 text-white" 
                            : "bg-zinc-900 border border-zinc-800 hover:border-zinc-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm disabled:opacity-50 hover:border-zinc-600 transition-colors font-medium"
                >
                  Next
                </button>
              </div>
            )}

            {/* Results count */}
            <p className="text-center text-xs text-zinc-500 mt-4">
              Showing {orders.length} of {totalCount} orders
            </p>
          </>
        )}
      </div>
    </div>
  );
}