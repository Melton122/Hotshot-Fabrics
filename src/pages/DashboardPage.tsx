import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import {
  Package, Heart, MapPin, User, Settings, ShoppingBag,
  ChevronRight, Star, TrendingUp, DollarSign
} from "lucide-react";

export function DashboardPage() {
  const { user, profile, setCurrentView } = useApp();
  const [stats, setStats] = useState({ orders: 0, wishlist: 0, addresses: 0, totalSpent: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboard();
    else setLoading(false);
  }, [user]);

  const fetchDashboard = async () => {
    setLoading(true);
    const [{ count: ordersCount }, { count: wishlistCount }, { count: addressesCount }, { data: orders }] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("wishlist").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("user_addresses").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(3)
    ]);
    setStats({
      orders: ordersCount || 0,
      wishlist: wishlistCount || 0,
      addresses: addressesCount || 0,
      totalSpent: profile?.total_spent || 0
    });
    if (orders) setRecentOrders(orders);
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Please sign in</h2>
          <button onClick={() => setCurrentView("login")} className="px-6 py-2 bg-orange-500 rounded-lg font-bold">Sign In</button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: Package, label: "My Orders", count: stats.orders, view: "orders", color: "text-blue-400" },
    { icon: Heart, label: "Wishlist", count: stats.wishlist, view: "wishlist", color: "text-red-400" },
    { icon: MapPin, label: "Addresses", count: stats.addresses, view: "addresses", color: "text-green-400" },
    { icon: Settings, label: "Settings", count: null, view: "profile", color: "text-zinc-400" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-2xl font-black">{profile?.full_name?.[0] || user.email?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.full_name || "Welcome"}</h2>
              <p className="text-zinc-400 text-sm">{user.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded">{profile?.role}</span>
                <span className="text-xs text-zinc-500">Member since {new Date(profile?.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: ShoppingBag, label: "Orders", value: stats.orders, color: "bg-blue-500/10 text-blue-400" },
            { icon: Heart, label: "Wishlist", value: stats.wishlist, color: "bg-red-500/10 text-red-400" },
            { icon: DollarSign, label: "Total Spent", value: `R${stats.totalSpent.toFixed(2)}`, color: "bg-green-500/10 text-green-400" },
            { icon: Star, label: "Points", value: Math.floor(stats.totalSpent / 10), color: "bg-orange-500/10 text-orange-400" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-sm text-zinc-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Menu */}
        <div className="space-y-2 mb-8">
          {menuItems.map((item) => (
            <motion.button
              key={item.label}
              whileHover={{ x: 4 }}
              onClick={() => setCurrentView(item.view as any)}
              className="w-full flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">{item.label}</p>
              </div>
              {item.count !== null && (
                <span className="px-2 py-1 bg-zinc-800 rounded-lg text-xs font-bold">{item.count}</span>
              )}
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </motion.button>
          ))}
        </div>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <div>
            <h3 className="font-bold text-lg mb-4">Recent Orders</h3>
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setCurrentView("order-detail", { orderId: order.id })}
                  className="w-full flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-semibold">{order.order_number}</p>
                    <p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-orange-400 font-bold">R{order.total?.toFixed(2)}</span>
                    <span className={`text-xs px-2 py-1 rounded ${statusConfig[order.status]?.bg || "bg-zinc-800"} ${statusConfig[order.status]?.color || "text-zinc-400"}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const statusConfig: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-yellow-400", bg: "bg-yellow-500/10" },
  confirmed: { color: "text-blue-400", bg: "bg-blue-500/10" },
  preparing: { color: "text-orange-400", bg: "bg-orange-500/10" },
  ready_for_delivery: { color: "text-purple-400", bg: "bg-purple-500/10" },
  out_for_delivery: { color: "text-cyan-400", bg: "bg-cyan-500/10" },
  delivered: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  cancelled: { color: "text-red-400", bg: "bg-red-500/10" },
};
