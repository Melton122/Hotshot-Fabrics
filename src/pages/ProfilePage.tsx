// src/pages/ProfilePage.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import {
  User, Camera, Save, Loader2, Package, ShoppingBag,
  Star, CheckCircle, Calendar, Gift,
  ChevronRight, Trophy, Flame, Crown, Shield, Sparkles,
  Heart, TrendingUp, Award, Settings, MapPin
} from "lucide-react";

const LOYALTY_TIERS = [
  { name: "Bronze", min: 0, max: 499, color: "text-amber-600", bg: "bg-amber-700/10", border: "border-amber-700/20", icon: Shield },
  { name: "Silver", min: 500, max: 1499, color: "text-zinc-300", bg: "bg-zinc-400/10", border: "border-zinc-400/20", icon: Star },
  { name: "Gold", min: 1500, max: 3999, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: Award },
  { name: "Platinum", min: 4000, max: 9999, color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: Trophy },
  { name: "Diamond", min: 10000, max: Infinity, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: Crown },
];

function getTier(points: number) {
  return LOYALTY_TIERS.find(t => points >= t.min && points <= t.max) || LOYALTY_TIERS[0];
}
function getNextTier(points: number) {
  const idx = LOYALTY_TIERS.findIndex(t => points >= t.min && points <= t.max);
  return idx < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[idx + 1] : null;
}

export function ProfilePage() {
  const { user, profile, setCurrentView, toast, refreshUser } = useApp();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "loyalty" | "orders">("profile");
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
    gender: ""
  });

  // Reset image error when avatar_url changes
  useEffect(() => {
    setImgError(false);
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        date_of_birth: profile.date_of_birth?.split("T")[0] || "",
        gender: profile.gender || ""
      });
    }
  }, [profile]);

  // Fetch orders + compute total spent from orders as fallback
  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, order_number, status, total, created_at, payment_status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          // Fallback: try common alternative column names
          const { data: altData, error: altError } = await supabase
            .from("orders")
            .select("id, order_number, status, total_amount, total, created_at, payment_status")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (altError) throw altError;
          setRecentOrders((altData || []).map((o: any) => ({
            ...o,
            total: o.total ?? o.total_amount ?? 0
          })));
        } else {
          setRecentOrders((data || []).map((o: any) => ({
            ...o,
            total: o.total ?? o.total_amount ?? 0
          })));
        }
      } catch (err: any) {
        console.error("Orders fetch error:", err);
        setOrdersError(err.message || "Failed to load orders");
        setRecentOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  // Compute total spent from orders if profile doesn't have it
  const computedTotalSpent = useMemo(() => {
    if (profile?.total_spent && profile.total_spent > 0) {
      return Number(profile.total_spent);
    }
    return recentOrders.reduce((sum, o) => {
      const amount = Number(o.total || o.total_amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [profile?.total_spent, recentOrders]);

  const computedTotalOrders = useMemo(() => {
    if (profile?.total_orders && profile.total_orders > 0) {
      return profile.total_orders;
    }
    return recentOrders.length;
  }, [profile?.total_orders, recentOrders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          gender: formData.gender || null,
          date_of_birth: formData.date_of_birth || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;
      setSaveSuccess(true);
      toast("Profile updated!", "success");
      await refreshUser();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      toast(err.message || "Error updating profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast("Please upload an image file", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("Image must be under 2MB", "error");
      return;
    }

    setUploading(true);
    setImgError(false);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/avatar.${fileExt}`;

      // 1. Upload with upsert (overwrite old)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message);
      }

      // 2. Try signed URL first (always works even if bucket is private)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("avatars")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      let finalUrl: string;

      if (signedError || !signedData?.signedUrl) {
        // Fallback to public URL
        const { data: publicData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        finalUrl = `${publicData.publicUrl}?t=${Date.now()}`;
        console.log("Using public URL:", finalUrl);
      } else {
        finalUrl = signedData.signedUrl;
        console.log("Using signed URL:", finalUrl);
      }

      // 3. Save to DB
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ avatar_url: finalUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("DB update error:", updateError);
        throw new Error(updateError.message);
      }

      // 4. Force refresh profile in context
      await refreshUser();
      toast("Profile photo updated!", "success");
    } catch (err: any) {
      console.error("Avatar upload full error:", err);
      toast("Error: " + (err.message || "Upload failed"), "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <User className="w-10 h-10 text-zinc-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Please sign in</h2>
          <button onClick={() => setCurrentView("login")}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold mt-4 transition-all">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const points = profile?.loyalty_points || 0;
  const tier = getTier(points);
  const nextTier = getNextTier(points);
  const TierIcon = tier.icon;
  const progressToNext = nextTier
    ? ((points - tier.min) / (nextTier.min - tier.min)) * 100
    : 100;

  const statusColors: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-500/10",
    confirmed: "text-blue-400 bg-blue-500/10",
    preparing: "text-orange-400 bg-orange-500/10",
    out_for_delivery: "text-cyan-400 bg-cyan-500/10",
    delivered: "text-emerald-400 bg-emerald-500/10",
    cancelled: "text-red-400 bg-red-500/10",
    completed: "text-emerald-400 bg-emerald-500/10",
    paid: "text-emerald-400 bg-emerald-500/10",
  };

  const initials = (formData.full_name || user.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen pt-24 pb-20 bg-black">
      <div className="max-w-3xl mx-auto px-4">

        {/* ── Hero Profile Card ─────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-transparent to-purple-500/10 pointer-events-none" />
          <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-white/5 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ring-2 ring-zinc-800 overflow-hidden bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
                  {profile?.avatar_url && !imgError ? (
                    <img
                      key={profile.avatar_url}
                      src={profile.avatar_url}
                      alt="Avatar"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="text-3xl font-black text-orange-400">{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 w-9 h-9 bg-orange-500 hover:bg-orange-400 rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-110 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Camera className="w-4 h-4 text-black" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap mb-1">
                  <h2 className="text-2xl sm:text-3xl font-black">{profile?.full_name || "Your Name"}</h2>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 ${tier.bg} ${tier.color} ${tier.border}`}>
                    <TierIcon className="w-3 h-3" /> {tier.name}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mb-3">{user.email}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  {user.email_confirmed_at && (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                    profile?.role === "admin" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}>
                    {profile?.role === "admin" ? "Admin" : profile?.role === "manager" ? "Manager" : "Customer"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Orders", value: computedTotalOrders, icon: Package, color: "orange" },
            { label: "Spent", value: `R${computedTotalSpent.toFixed(0)}`, icon: TrendingUp, color: "emerald" },
            { label: "Points", value: (profile?.loyalty_points || 0).toLocaleString(), icon: Sparkles, color: "amber" },
            { label: "Joined", value: new Date(profile?.created_at || Date.now()).toLocaleDateString("en-ZA", { month: "short", year: "numeric" }), icon: Calendar, color: "blue" },
          ].map(stat => {
            const Ic = stat.icon;
            const colorMap: Record<string, string> = {
              orange: "text-orange-400 bg-orange-500/10",
              emerald: "text-emerald-400 bg-emerald-500/10",
              amber: "text-amber-400 bg-amber-500/10",
              blue: "text-blue-400 bg-blue-500/10"
            };
            return (
              <div key={stat.label} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorMap[stat.color]}`}>
                  <Ic className="w-4 h-4" />
                </div>
                <p className="text-xl font-black">{stat.value}</p>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6">
          {(["profile", "loyalty", "orders"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── PROFILE TAB ─── */}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-emerald-400">Profile saved successfully!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="font-bold text-base flex items-center gap-2 mb-6">
                  <Settings className="w-4 h-4 text-orange-400" /> Personal Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
                    <input type="text" value={formData.full_name} placeholder="Jane Doe"
                      onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 hover:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                    <input type="email" value={user.email || ""} disabled
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-500 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Phone Number</label>
                    <input type="tel" value={formData.phone} placeholder="+27 82 000 0000"
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 hover:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date of Birth</label>
                    <input type="date" value={formData.date_of_birth}
                      onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 hover:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors [color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gender</label>
                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 hover:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none">
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Rather not say</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end mt-6 pt-5 border-t border-zinc-800">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                    className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-bold text-sm flex items-center gap-2 transition-all">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── LOYALTY TAB ─── */}
          {activeTab === "loyalty" && (
            <motion.div key="loyalty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

              {/* Current Tier Card */}
              <div className={`rounded-2xl border p-6 ${tier.bg} ${tier.border}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Your Tier</p>
                    <div className={`text-3xl font-black flex items-center gap-2 ${tier.color}`}>
                      <TierIcon className="w-8 h-8" /> {tier.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black">{points.toLocaleString()}</p>
                    <p className="text-xs text-zinc-400">total points</p>
                  </div>
                </div>

                {nextTier && (
                  <>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                      <span>{tier.name}</span>
                      <span>{nextTier.min - points} pts to {nextTier.name}</span>
                    </div>
                    <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(2, progressToNext)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }} />
                    </div>
                  </>
                )}

                {!nextTier && (
                  <div className="flex items-center gap-2 mt-2">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-400 font-semibold">You've reached the highest tier!</span>
                  </div>
                )}
              </div>

              {/* Points value */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                    <Gift className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-bold">Redeem Points</p>
                    <p className="text-xs text-zinc-400">10 pts = R1.00 discount at checkout</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-amber-400">R{(points * 0.1).toFixed(0)}</p>
                  <p className="text-xs text-zinc-400">value</p>
                </div>
              </div>

              {/* How to earn */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" /> How to Earn Points
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Every purchase", desc: "1 point per R10 spent", pts: "+10 pts / R100" },
                    { label: "Complete your profile", desc: "Add phone & birthday", pts: "+50 pts" },
                    { label: "First order", desc: "Welcome bonus", pts: "+100 pts" },
                    { label: "Refer a friend", desc: "When they make a purchase", pts: "+200 pts" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-zinc-800 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{row.label}</p>
                        <p className="text-xs text-zinc-500">{row.desc}</p>
                      </div>
                      <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg">{row.pts}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Tiers */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-orange-400" /> Loyalty Tiers
                </h3>
                <div className="space-y-2">
                  {LOYALTY_TIERS.map(t => {
                    const Ic = t.icon;
                    const isCurrent = t.name === tier.name;
                    return (
                      <div key={t.name} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent ? `${t.bg} ${t.border} border` : "border border-transparent"}`}>
                        <Ic className={`w-5 h-5 ${t.color}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${t.color}`}>{t.name}</span>
                            {isCurrent && <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">Current</span>}
                          </div>
                          <p className="text-xs text-zinc-500">
                            {t.max === Infinity ? `${t.min.toLocaleString()}+ points` : `${t.min.toLocaleString()}–${t.max.toLocaleString()} points`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ORDERS TAB ─── */}
          {activeTab === "orders" && (
            <motion.div key="orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-orange-400" /> Recent Orders
                  </h2>
                  <button onClick={() => setCurrentView("orders")}
                    className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1">
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                  </div>
                ) : ordersError ? (
                  <div className="text-center p-12">
                    <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="font-semibold text-zinc-400">Could not load orders</p>
                    <p className="text-sm text-zinc-600 mb-4">{ordersError}</p>
                    <button onClick={() => window.location.reload()}
                      className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-all">
                      Retry
                    </button>
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center p-12">
                    <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="font-semibold text-zinc-400">No orders yet</p>
                    <p className="text-sm text-zinc-600 mb-4">Start shopping to see your orders here</p>
                    <button onClick={() => setCurrentView("shop")}
                      className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-all">
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {recentOrders.map(order => (
                      <button key={order.id} onClick={() => setCurrentView("order-detail", { orderId: order.id })}
                        className="w-full text-left p-4 hover:bg-zinc-800/50 transition-all flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono font-bold text-sm text-orange-400">{order.order_number || `#${order.id?.slice(0, 8)}`}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[order.status] || "text-zinc-400 bg-zinc-800"}`}>
                              {(order.status || "pending").replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString("en-ZA", { dateStyle: "medium" }) : "—"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm">R{Number(order.total || 0).toFixed(2)}</p>
                          <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto mt-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => setCurrentView("addresses")}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 text-left transition-all group">
                  <MapPin className="w-5 h-5 text-orange-400 mb-2" />
                  <p className="font-semibold text-sm">My Addresses</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Manage delivery addresses</p>
                </button>
                <button onClick={() => setCurrentView("wishlist")}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 text-left transition-all group">
                  <Heart className="w-5 h-5 text-pink-400 mb-2" />
                  <p className="font-semibold text-sm">Wishlist</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Saved products</p>
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}