// ============================================
// HOTSHOT FABRICS - COUPON ADMIN
// Full CRUD + Real-time + Advanced Filters
// ============================================
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import {
  Plus, Trash2, Edit2, Copy, RefreshCw, Search,
  ChevronLeft, ChevronRight, Filter, X, CheckCircle, AlertCircle,
  Tag, Percent, DollarSign, Calendar, Users, Zap, Wifi, WifiOff
} from "lucide-react";

// ---------- Types ----------
interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order_amount: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

type CouponFormData = Omit<Coupon, "id" | "usage_count" | "created_at">;

// ---------- Helper functions ----------
const formatDate = (date: string | null) => {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-ZA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

const getStatus = (coupon: Coupon): "active" | "expired" | "exhausted" => {
  if (!coupon.is_active) return "expired";
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return "expired";
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) return "exhausted";
  return "active";
};

// ---------- Main Component ----------
export function AdminCoupons() {
  const { toast } = useApp();

  // State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "exhausted">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponFormData>({
    code: "",
    type: "percentage",
    value: 0,
    min_order_amount: null,
    max_discount: null,
    usage_limit: null,
    expires_at: null,
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const fetchRef = useRef<() => Promise<void>>();

  // ---------- Fetch coupons with pagination & filters ----------
  const fetchCoupons = useCallback(async (pageNum = page) => {
    setLoading(true);
    try {
      let query = supabase
        .from("coupons")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Search by code
      if (search) {
        query = query.ilike("code", `%${search}%`);
      }

      // Apply filter
      if (filter === "active") {
        query = query
          .eq("is_active", true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .or(`usage_limit.is.null,usage_count.lt.usage_limit`);
      } else if (filter === "expired") {
        query = query.or(`is_active.eq.false,expires_at.lt.${new Date().toISOString()}`);
      } else if (filter === "exhausted") {
        query = query
          .eq("is_active", true)
          .not("usage_limit", "is", null)
          .gte("usage_count", "usage_limit");
      }

      // Pagination
      const from = (pageNum - 1) * 10;
      const to = from + 9;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      setCoupons(data || []);
      setTotalPages(Math.ceil((count || 0) / 10));
    } catch (err: any) {
      toast(`Failed to load coupons: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [search, filter, page, toast]);

  fetchRef.current = fetchCoupons;

  // ---------- Initial load & realtime ----------
  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    const channel = supabase
      .channel("coupons-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coupons" },
        () => {
          fetchRef.current?.();
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // ---------- Handle form input ----------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value === "" ? null : type === "number" ? parseFloat(value) : value,
    }));
  };

  // ---------- Open modal for create/edit ----------
  const openModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        min_order_amount: coupon.min_order_amount,
        max_discount: coupon.max_discount,
        usage_limit: coupon.usage_limit,
        expires_at: coupon.expires_at,
        is_active: coupon.is_active,
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: "",
        type: "percentage",
        value: 0,
        min_order_amount: null,
        max_discount: null,
        usage_limit: null,
        expires_at: null,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  // ---------- Save coupon (create or update) ----------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Trim and uppercase code
      const code = formData.code.trim().toUpperCase();

      // Validate
      if (!code) throw new Error("Coupon code is required");
      if (formData.value <= 0) throw new Error("Value must be greater than 0");

      const payload = {
        ...formData,
        code,
        value: formData.value,
        min_order_amount: formData.min_order_amount || null,
        max_discount: formData.max_discount || null,
        usage_limit: formData.usage_limit || null,
        expires_at: formData.expires_at || null,
        is_active: formData.is_active,
      };

      if (editingCoupon) {
        // Update
        const { error } = await supabase
          .from("coupons")
          .update(payload)
          .eq("id", editingCoupon.id);
        if (error) throw error;
        toast("Coupon updated successfully", "success");
      } else {
        // Create
        const { error } = await supabase.from("coupons").insert([payload]);
        if (error) throw error;
        toast("Coupon created successfully", "success");
      }

      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Delete coupon ----------
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      toast("Coupon deleted", "success");
      fetchCoupons();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  // ---------- Toggle active status ----------
  const toggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);
      if (error) throw error;
      toast(`Coupon ${coupon.is_active ? "disabled" : "enabled"}`, "success");
      fetchCoupons();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  // ---------- Reset filters ----------
  const resetFilters = () => {
    setSearch("");
    setFilter("all");
    setPage(1);
  };

  // ---------- Render status badge ----------
  const StatusBadge = ({ coupon }: { coupon: Coupon }) => {
    const status = getStatus(coupon);
    const colors = {
      active: "bg-green-500/20 text-green-400 border-green-500/30",
      expired: "bg-red-500/20 text-red-400 border-red-500/30",
      exhausted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };
    const icons = {
      active: <Zap className="w-3 h-3" />,
      expired: <AlertCircle className="w-3 h-3" />,
      exhausted: <Users className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${colors[status]}`}>
        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black">Coupons</h1>
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
                realtimeConnected
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
            >
              {realtimeConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {realtimeConnected ? "Live" : "Offline"}
            </span>
          </div>
          <p className="text-zinc-400 mt-1">Manage discount codes and promotions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetFilters}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-all"
            title="Reset filters"
          >
            <RefreshCw className="w-5 h-5 text-zinc-400" />
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> New Coupon
          </motion.button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code..."
            className="w-full pl-10 pr-4 py-2.5 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {["all", "active", "expired", "exhausted"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? "bg-orange-500/20 border border-orange-500/40 text-orange-400"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/40 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Value</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Min Order</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Uses</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Expires</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                        No coupons found. Create your first one!
                      </td>
                    </tr>
                  ) : (
                    coupons.map((coupon) => (
                      <tr key={coupon.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-orange-400">{coupon.code}</td>
                        <td className="px-4 py-3">
                          <span className="capitalize">{coupon.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          {coupon.type === "percentage" ? `${coupon.value}%` : `R${coupon.value}`}
                          {coupon.max_discount && (
                            <span className="text-xs text-zinc-500 ml-1">(max R{coupon.max_discount})</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {coupon.min_order_amount ? `R${coupon.min_order_amount}` : "None"}
                        </td>
                        <td className="px-4 py-3">
                          {coupon.usage_count}
                          {coupon.usage_limit !== null && ` / ${coupon.usage_limit}`}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDate(coupon.expires_at)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge coupon={coupon} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleActive(coupon)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                              title={coupon.is_active ? "Disable" : "Enable"}
                            >
                              {coupon.is_active ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              )}
                            </button>
                            <button
                              onClick={() => openModal(coupon)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(coupon.id)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-zinc-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ---------- Create/Edit Modal ---------- */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">
                {editingCoupon ? "Edit Coupon" : "Create Coupon"}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Code */}
                <div>
                  <label className="text-sm font-medium text-zinc-300">Coupon Code *</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. SUMMER20"
                    className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 text-sm uppercase"
                    required
                  />
                </div>

                {/* Type & Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Type</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Value *</label>
                    <input
                      type="number"
                      name="value"
                      value={formData.value}
                      onChange={handleInputChange}
                      placeholder="e.g. 20"
                      className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Min Order & Max Discount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Min Order (R)</label>
                    <input
                      type="number"
                      name="min_order_amount"
                      value={formData.min_order_amount ?? ""}
                      onChange={handleInputChange}
                      placeholder="e.g. 500"
                      className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Max Discount (R)</label>
                    <input
                      type="number"
                      name="max_discount"
                      value={formData.max_discount ?? ""}
                      onChange={handleInputChange}
                      placeholder="e.g. 100"
                      className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                      min="0"
                    />
                  </div>
                </div>

                {/* Usage Limit & Expiry */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Usage Limit</label>
                    <input
                      type="number"
                      name="usage_limit"
                      value={formData.usage_limit ?? ""}
                      onChange={handleInputChange}
                      placeholder="e.g. 100"
                      className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Expiry Date</label>
                    <input
                      type="datetime-local"
                      name="expires_at"
                      value={formData.expires_at?.slice(0, 16) ?? ""}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                    />
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <label className="text-sm font-medium text-zinc-300">Active</label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-zinc-800 rounded-xl font-medium hover:bg-zinc-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 disabled:opacity-50 transition"
                  >
                    {isSubmitting ? "Saving..." : editingCoupon ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}