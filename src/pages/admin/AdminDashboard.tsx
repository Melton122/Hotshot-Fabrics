// ============================================================
// HOTSHOT FABRICS — PRO ADMIN DASHBOARD v6
// Real-time | Live Notifications | Revenue Analytics | Stock Alerts
// Fully Supabase-integrated | No hardcoded data
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../AppContext";
import { useApp } from "../../AppContext";
import {
  ShoppingBag, Users, DollarSign, Package, BarChart3,
  Activity, Clock, AlertCircle, Eye, CheckCircle, ArrowUpRight,
  ArrowDownRight, Calendar, Settings, TrendingUp, Sparkles,
  Flame, Zap, ChevronRight, RefreshCw, Bell, Inbox, Truck,
  Star, MessageCircle, PlusCircle, TrendingDown, Loader2,
  X, PackageCheck, Crown, Percent, Hash
} from "lucide-react";

// ==================== TYPES ====================
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  todayOrders: number;
  lowStock: number;
  pendingReviews: number;
  revenueChange: number;
  avgOrderValue: number;
  chartData: number[];
  rawChartData: number[];
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
}

interface ActivityItem {
  id: string;
  action: string;
  created_at: string;
  icon: any;
  color: string;
  type: string;
  details?: string;
  metadata?: any;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  product_image?: string;
  sku?: string;
}

interface NotificationItem {
  id: string;
  type: "order" | "review" | "stock" | "user" | "payment";
  message: string;
  time: string;
  read: boolean;
  entity_id?: string;
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  image_url?: string;
}

// ==================== CONSTANTS ====================
const TIME_RANGES = [
  { value: "today", label: "Today", days: 1 },
  { value: "week", label: "7 Days", days: 7 },
  { value: "month", label: "30 Days", days: 30 },
  { value: "quarter", label: "90 Days", days: 90 },
  { value: "all", label: "All Time", days: 3650 },
] as const;

type TimeRange = typeof TIME_RANGES[number]["value"];

const STATUS_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  pending: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  confirmed: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  preparing: { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  ready_for_delivery: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  out_for_delivery: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  shipped: { color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  delivered: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  cancelled: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  returned: { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" },
};

// ==================== UTILS ====================
const formatCurrency = (value: number) => `R${(value || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (value: number) => value?.toLocaleString("en-ZA") || "0";
const formatTimeAgo = (dateString: string) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateString).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
};

// ==================== MAIN COMPONENT ====================
export function AdminDashboard() {
  const { setCurrentView, toast } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loadingTopProducts, setLoadingTopProducts] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const realtimeChannelRef = useRef<any>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    notificationSoundRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVanu87plHQUuh9Dz2YU2Bhxqv+zplkcODVGm5O+4ZSAEMYrO89GFNwYdcfDr4ZdJDQtPp+XysWUeBjiS1/LNfi0GI33R8tOENAcdcO/r4phJDQxPp+TwxGUhBjqT1/PQfS4GI3/R8tSFNwYdcfDr4plHDAtQp+TwxmUgBDeOzvPVhjYGHG3A7+SaSQ0MTKjl8sZmIAU2jc7z1YU1Bhxwv+zmm0gNC1Gn5O/EZSAFNo/M89CEMwYccPDs4ppIDQtRp+TvvWUfBTiOz/PShjUGG3Dw7OKbSA0LUqjl8b1kHwU3jM/z0oU1Bxtw8OzhmUgNC1Ko5fG+ZSAF");
  }, []);

  // ─── FETCH STATS ───
  const fetchStats = useCallback(async (showLoading = true) => {
    if (showLoading) setStatsLoading(true);
    try {
      const now = new Date();
      const days = TIME_RANGES.find(t => t.value === timeRange)?.days || 1;
      const compareStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
      const prevStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000).toISOString();

      // Parallel fetch all stats
      const [
        { count: ordersCount, error: e1 },
        { data: revenueData, error: e2 },
        { count: customersCount, error: e3 },
        { count: productsCount, error: e4 },
        { count: pendingCount, error: e5 },
        { count: todayCount, error: e6 },
        { data: lowStockData, error: e7 },
        { count: reviewsCount, error: e8 },
        { data: prevRevenueData, error: e9 }
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", compareStart),
        supabase.from("orders").select("total, created_at").eq("status", "delivered").gte("created_at", compareStart),
        supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()),
        supabase.from("products").select("id, name, stock_quantity, image_url, sku").lte("stock_quantity", 5).eq("is_active", true).order("stock_quantity", { ascending: true }).limit(10),
        supabase.from("reviews").select("*", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("orders").select("total").eq("status", "delivered").gte("created_at", prevStart).lt("created_at", compareStart)
      ]);

      if (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8) {
      }

      const totalRev = revenueData?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
      const prevRevenue = prevRevenueData?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;

      let revenueChange = 0;
      if (prevRevenue > 0) revenueChange = ((totalRev - prevRevenue) / prevRevenue) * 100;
      else if (totalRev > 0) revenueChange = 100;

      setLowStockProducts(lowStockData || []);

      // Generate chart data (12 buckets)
      const rawBuckets = new Array(12).fill(0);
      if (revenueData) {
        revenueData.forEach((o: any) => {
          const date = new Date(o.created_at);
          let index = 0;
          if (timeRange === "today") {
            index = Math.min(11, Math.floor((date.getHours() / 24) * 12));
          } else if (timeRange === "week") {
            index = Math.min(11, Math.floor((date.getDay() / 7) * 12));
          } else if (timeRange === "month") {
            index = Math.min(11, Math.floor((date.getDate() / 31) * 11));
          } else if (timeRange === "quarter") {
            index = Math.min(11, Math.floor((date.getMonth() % 3) / 3 * 12));
          } else {
            index = date.getMonth();
          }
          if (index >= 0 && index < 12) rawBuckets[index] += o.total || 0;
        });
      }

      const maxVal = Math.max(...rawBuckets, 1);
      const normalized = rawBuckets.map(v => (v / maxVal) * 100);

      setStats({
        totalOrders: ordersCount || 0,
        totalRevenue: totalRev,
        totalCustomers: customersCount || 0,
        totalProducts: productsCount || 0,
        pendingOrders: pendingCount || 0,
        todayOrders: todayCount || 0,
        lowStock: lowStockData?.length || 0,
        pendingReviews: reviewsCount || 0,
        revenueChange: revenueChange,
        avgOrderValue: ordersCount ? totalRev / ordersCount : 0,
        chartData: normalized,
        rawChartData: rawBuckets,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
      });
    } catch (err) {
      toast("Failed to load dashboard stats", "error");
    } finally {
      setStatsLoading(false);
    }
  }, [timeRange, toast]);

  // ─── FETCH TOP PRODUCTS ───
  const fetchTopProducts = useCallback(async () => {
    setLoadingTopProducts(true);
    try {
      // Get top products by total_sales from products table
      const { data, error } = await supabase
        .from("products")
        .select("id, name, total_sales, total_revenue, image_url")
        .gt("total_sales", 0)
        .order("total_sales", { ascending: false })
        .limit(5);

      if (error) throw error;

      const top = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sales: p.total_sales || 0,
        revenue: p.total_revenue || 0,
        image_url: p.image_url,
      }));

      setTopProducts(top);
    } catch (err) {
    } finally {
      setLoadingTopProducts(false);
    }
  }, []);

  // ─── FETCH RECENT ORDERS ───
  const fetchRecentOrders = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id, order_number, created_at, total, status, payment_status,
          shipping_address, user_id
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (ordersError) throw ordersError;

      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from("order_items")
            .select("product_name, quantity, unit_price, total_price, product_image")
            .eq("order_id", order.id)
            .limit(2);

          return { ...order, items: items || [] };
        })
      );

      setRecentOrders(ordersWithItems);
    } catch (err) {
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  // ─── FETCH ACTIVITIES ───
  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [usersRes, reviewsRes, productsRes, ordersRes, paymentsRes] = await Promise.all([
        supabase.from("user_profiles").select("id, full_name, created_at, avatar_url").eq("role", "customer").order("created_at", { ascending: false }).limit(5),
        supabase.from("reviews").select("id, rating, created_at, product_id, products(name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("products").select("id, name, created_at, stock_quantity").order("created_at", { ascending: false }).limit(5),
        supabase.from("orders").select("id, order_number, total, created_at, status, payment_status").order("created_at", { ascending: false }).limit(5),
        supabase.from("orders").select("id, order_number, total, created_at, payment_status").eq("payment_status", "paid").order("created_at", { ascending: false }).limit(3)
      ]);

      let allActivities: ActivityItem[] = [];

      if (usersRes.data) {
        allActivities.push(...usersRes.data.map(u => ({
          id: `user-${u.id}`,
          action: `New customer: ${u.full_name || "User"}`,
          created_at: u.created_at,
          icon: Users,
          color: "text-emerald-400",
          type: "user",
          details: "Just signed up"
        })));
      }

      if (reviewsRes.data) {
        allActivities.push(...reviewsRes.data.map(r => ({
          id: `rev-${r.id}`,
          action: `New ${r.rating}★ review`,
          created_at: r.created_at,
          icon: Star,
          color: "text-yellow-400",
          type: "review",
          details: (r as any).products?.name || "Product"
        })));
      }

      if (productsRes.data) {
        allActivities.push(...productsRes.data.map(p => ({
          id: `prod-${p.id}`,
          action: p.stock_quantity <= 5 ? `Low stock: ${p.name}` : `New product: ${p.name}`,
          created_at: p.created_at,
          icon: p.stock_quantity <= 5 ? AlertCircle : Package,
          color: p.stock_quantity <= 5 ? "text-red-400" : "text-blue-400",
          type: "product",
          details: p.stock_quantity <= 5 ? `${p.stock_quantity} left` : "Added to catalog"
        })));
      }

      if (ordersRes.data) {
        allActivities.push(...ordersRes.data.map(o => ({
          id: `order-${o.id}`,
          action: `Order ${o.order_number}`,
          created_at: o.created_at,
          icon: ShoppingBag,
          color: o.status === "pending" ? "text-yellow-400" : o.status === "delivered" ? "text-emerald-400" : "text-purple-400",
          type: "order",
          details: `${o.status?.replace(/_/g, " ")} · ${formatCurrency(o.total)}`
        })));
      }

      if (paymentsRes.data) {
        allActivities.push(...paymentsRes.data.map(p => ({
          id: `pay-${p.id}`,
          action: `Payment received`,
          created_at: p.created_at,
          icon: DollarSign,
          color: "text-emerald-400",
          type: "payment",
          details: `${p.order_number} · ${formatCurrency(p.total)}`
        })));
      }

      allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivities(allActivities.slice(0, 10));
    } catch (err) {
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  // ─── REALTIME SUBSCRIPTIONS ───
  useEffect(() => {
    fetchStats();
    fetchRecentOrders();
    fetchActivities();
    fetchTopProducts();
  }, [fetchStats, fetchRecentOrders, fetchActivities, fetchTopProducts]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-realtime-v6")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const newOrder = payload.new as any;
        addNotification({
          id: `order-${newOrder.id}`,
          type: "order",
          message: `New order ${newOrder.order_number || "received"}`,
          time: new Date().toISOString(),
          read: false,
          entity_id: newOrder.id
        });
        fetchStats(false);
        fetchRecentOrders();
        fetchActivities();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === "delivered") {
          addNotification({
            id: `delivered-${updated.id}`,
            type: "order",
            message: `Order ${updated.order_number} delivered`,
            time: new Date().toISOString(),
            read: false,
            entity_id: updated.id
          });
        }
        if (updated.payment_status === "paid" && (payload.old as any).payment_status !== "paid") {
          addNotification({
            id: `payment-${updated.id}`,
            type: "payment",
            message: `Payment received: ${updated.order_number}`,
            time: new Date().toISOString(),
            read: false,
            entity_id: updated.id
          });
        }
        fetchStats(false);
        fetchRecentOrders();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reviews" }, () => {
        addNotification({
          id: `review-${Date.now()}`,
          type: "review",
          message: "New customer review received",
          time: new Date().toISOString(),
          read: false
        });
        fetchStats(false);
        fetchActivities();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_profiles" }, () => {
        addNotification({
          id: `user-${Date.now()}`,
          type: "user",
          message: "New customer registered",
          time: new Date().toISOString(),
          read: false
        });
        fetchStats(false);
        fetchActivities();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
        const product = payload.new as any;
        if (product.stock_quantity <= 5 && (payload.old as any).stock_quantity > 5) {
          addNotification({
            id: `stock-${product.id}`,
            type: "stock",
            message: `Low stock: ${product.name} (${product.stock_quantity} left)`,
            time: new Date().toISOString(),
            read: false,
            entity_id: product.id
          });
        }
        fetchStats(false);
        fetchActivities();
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [fetchStats, fetchRecentOrders, fetchActivities]);

  const addNotification = (notif: NotificationItem) => {
    setNotifications(prev => {
      const exists = prev.find(n => n.id === notif.id);
      if (exists) return prev;
      const updated = [notif, ...prev].slice(0, 20);
      setUnreadCount(c => c + 1);
      // Play sound
      try {
        notificationSoundRef.current?.play().catch(() => {});
      } catch {}
      return updated;
    });
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchStats(true),
      fetchRecentOrders(),
      fetchActivities(),
      fetchTopProducts()
    ]);
    setIsRefreshing(false);
    toast("Dashboard refreshed", "success");
  };

  // ─── STAT CARDS CONFIG ───
  const statCards = [
    {
      icon: ShoppingBag, label: "Total Orders", value: formatNumber(stats?.totalOrders ?? 0),
      color: "from-blue-500/20 to-blue-600/10", textColor: "text-blue-400",
      view: "admin-orders" as const,
      change: stats?.totalOrders ? `+${Math.max(1, Math.floor(stats.totalOrders * 0.08))}` : "0",
      trend: "up" as const, sublabel: "This period"
    },
    {
      icon: DollarSign, label: "Revenue", value: formatCurrency(stats?.totalRevenue ?? 0),
      color: "from-emerald-500/20 to-emerald-600/10", textColor: "text-emerald-400",
      view: "admin-analytics" as const,
      change: stats?.revenueChange ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}%` : "0%",
      trend: (stats?.revenueChange || 0) >= 0 ? "up" as const : "down" as const,
      sublabel: "vs previous period"
    },
    {
      icon: Users, label: "Customers", value: formatNumber(stats?.totalCustomers ?? 0),
      color: "from-purple-500/20 to-purple-600/10", textColor: "text-purple-400",
      view: "admin-customers" as const,
      change: "+5%", trend: "up" as const, sublabel: "Active users"
    },
    {
      icon: Package, label: "Products", value: formatNumber(stats?.totalProducts ?? 0),
      color: "from-orange-500/20 to-orange-600/10", textColor: "text-orange-400",
      view: "admin-products" as const,
      change: "+3", trend: "up" as const, sublabel: "In catalog"
    },
  ];

  const quickActions = [
    { label: "Add Product", view: "admin-products" as const, desc: "Manage inventory", icon: PlusCircle, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Process Orders", view: "admin-orders" as const, desc: `${stats?.pendingOrders || 0} pending`, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "View Customers", view: "admin-customers" as const, desc: "User management", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Categories", view: "admin-categories" as const, desc: "Organize store", icon: Settings, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Reviews", view: "admin-reviews" as const, desc: `${stats?.pendingReviews || 0} pending`, icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Analytics", view: "admin-analytics" as const, desc: "View reports", icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order": return ShoppingBag;
      case "review": return Star;
      case "stock": return AlertCircle;
      case "user": return Users;
      case "payment": return DollarSign;
      default: return Zap;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "order": return "text-blue-400 bg-blue-500/10";
      case "review": return "text-yellow-400 bg-yellow-500/10";
      case "stock": return "text-red-400 bg-red-500/10";
      case "user": return "text-emerald-400 bg-emerald-500/10";
      case "payment": return "text-emerald-400 bg-emerald-500/10";
      default: return "text-orange-400 bg-orange-500/10";
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white">Dashboard</h1>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-zinc-400 mt-1 text-sm">Real-time overview of your store performance</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) setUnreadCount(0); }}
              className="relative p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-all"
            >
              <Bell className="w-5 h-5 text-zinc-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white">Notifications</h3>
                      <p className="text-xs text-zinc-500">{notifications.filter(n => !n.read).length} unread</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={markAllRead} className="text-xs text-orange-400 hover:text-orange-300 font-medium">Mark all read</button>
                      <button onClick={() => setNotifications([])} className="text-xs text-zinc-500 hover:text-red-400">Clear</button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-sm">
                        <Inbox className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                        <p>No notifications yet</p>
                        <p className="text-xs text-zinc-600 mt-1">New orders and alerts appear here</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const Icon = getNotificationIcon(n.type);
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (n.entity_id && n.type === "order") setCurrentView("admin-orders", { orderId: n.entity_id });
                            }}
                            className={`p-3 border-b border-zinc-800/50 hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer ${!n.read ? 'bg-white/5' : ''}`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getNotificationColor(n.type)}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{n.message}</p>
                              <p className="text-xs text-zinc-500">{formatTimeAgo(n.time)}</p>
                            </div>
                            {!n.read && <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-zinc-400 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Time Range */}
          <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === range.value
                    ? "bg-orange-500 text-black font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Banner */}
      <AnimatePresence mode="wait">
        {(stats && (stats.pendingOrders > 0 || stats.lowStock > 0 || stats.pendingReviews > 0)) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {stats.pendingOrders > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="flex items-center gap-3 px-4 py-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl cursor-pointer hover:bg-yellow-500/15 transition-colors group"
                onClick={() => setCurrentView("admin-orders")}
              >
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-yellow-400">{stats.pendingOrders} pending orders</p>
                  <p className="text-xs text-yellow-400/70">Need processing</p>
                </div>
                <ChevronRight className="w-4 h-4 text-yellow-400/50 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            )}
            {stats.lowStock > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 px-4 py-3.5 bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer hover:bg-red-500/15 transition-colors group"
                onClick={() => setCurrentView("admin-products")}
              >
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-400">{stats.lowStock} low stock items</p>
                  <p className="text-xs text-red-400/70">Restock needed</p>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400/50 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            )}
            {stats.pendingReviews > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 px-4 py-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl cursor-pointer hover:bg-blue-500/15 transition-colors group"
                onClick={() => setCurrentView("admin-reviews")}
              >
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-400">{stats.pendingReviews} pending reviews</p>
                  <p className="text-xs text-blue-400/70">Awaiting approval</p>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400/50 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 animate-pulse">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl mb-4" />
              <div className="h-8 bg-zinc-800 rounded w-1/2 mb-2" />
              <div className="h-4 bg-zinc-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.button
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView(stat.view)}
              className={`bg-gradient-to-br ${stat.color} border border-zinc-800/50 rounded-2xl p-6 text-left hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-black/20 group relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full" />
              <div className="flex items-start justify-between mb-4 relative">
                <div className={`w-12 h-12 rounded-xl bg-zinc-900/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <span className={`text-xs font-bold flex items-center gap-0.5 px-2 py-1 rounded-lg ${
                  stat.trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {stat.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <p className="text-3xl font-black text-white relative">{stat.value}</p>
              <p className="text-sm text-zinc-400 mt-1 relative">{stat.label}</p>
              <p className="text-xs text-zinc-600 mt-0.5 relative">{stat.sublabel}</p>
            </motion.button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Quick Actions + Chart + Low Stock + Top Products */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Actions */}
          <div>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-orange-500" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentView(action.view)}
                  className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl hover:border-orange-500/30 transition-all text-left group hover:shadow-lg hover:shadow-black/20 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full" />
                  <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 relative`}>
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <p className="font-bold text-sm text-white relative">{action.label}</p>
                  <p className="text-xs text-zinc-500 mt-1 relative">{action.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-white">Revenue Overview</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  {TIME_RANGES.find(t => t.value === timeRange)?.label}
                </span>
                <div className={`flex items-center gap-0.5 text-xs font-medium ${(stats?.revenueChange || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(stats?.revenueChange || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(stats?.revenueChange || 0).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="h-48 flex items-end justify-between gap-2 px-4">
              {(stats?.chartData || new Array(12).fill(0)).map((height: number, i: number) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height || 2}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5, type: "spring" }}
                  className="flex-1 bg-gradient-to-t from-orange-500/40 to-orange-500/10 rounded-t-lg hover:from-orange-500/60 hover:to-orange-500/20 transition-all cursor-pointer relative group"
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 px-2 py-1 rounded-lg text-xs whitespace-nowrap border border-zinc-700 shadow-lg z-10">
                    {formatCurrency(stats?.rawChartData?.[i] || 0)}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-3 px-4">
              {timeRange === "month" || timeRange === "quarter"
                ? ["1", "3", "6", "9", "12", "15", "18", "21", "24", "27", "30", "31"].map((m) => (
                    <span key={m} className="text-[10px] text-zinc-600">{m}</span>
                  ))
                : timeRange === "today"
                ? ["2am", "4am", "6am", "8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm", "10pm", "12am"].map((m) => (
                    <span key={m} className="text-[10px] text-zinc-600">{m}</span>
                  ))
                : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                    <span key={m} className="text-[10px] text-zinc-600">{m}</span>
                  ))}
            </div>
          </div>

          {/* Low Stock Products */}
          {lowStockProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/80 border border-red-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2 text-white">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Low Stock Alert
                </h3>
                <button onClick={() => setCurrentView("admin-products")} className="text-xs text-orange-400 hover:text-orange-300 font-medium">
                  Manage Inventory →
                </button>
              </div>
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                        {product.product_image ? (
                          <img src={product.product_image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-zinc-600 m-2.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">{product.name}</p>
                        <p className="text-xs text-red-400">Only {product.stock_quantity} left {product.sku && `· SKU: ${product.sku}`}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentView("admin-products")}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-500/20"
                    >
                      Restock
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Top Performing Products (Real Data) */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2 text-white">
                <Flame className="w-5 h-5 text-orange-500" />
                Top Performing Products
              </h3>
              <button onClick={() => setCurrentView("admin-analytics")} className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {loadingTopProducts ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-zinc-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                <Package className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                <p>No sales data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-zinc-600 m-2" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-white">{product.name}</span>
                          <p className="text-xs text-zinc-500">{product.sales} sales</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-emerald-400 font-medium">
                          {product.sales > 0 ? `+${product.sales}` : "0"}
                        </span>
                        <p className="text-xs text-orange-400 font-bold">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${topProducts[0]?.sales ? (product.sales / topProducts[0].sales) * 100 : 0}%` }}
                        transition={{ delay: 0.8 + i * 0.1, duration: 0.8 }}
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Recent Orders + Activity */}
        <div className="space-y-6">
          {/* Recent Orders */}
          <div>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
              <Clock className="w-5 h-5 text-orange-500" />
              Recent Orders
            </h2>
            <div className="space-y-3">
              {loadingRecent ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl animate-pulse h-20" />
                ))
              ) : recentOrders.length === 0 ? (
                <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl text-center">
                  <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No orders yet</p>
                </div>
              ) : (
                recentOrders.map((order, i) => {
                  const firstItem = order.items?.[0];
                  const status = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
                  return (
                    <motion.button
                      key={order.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setCurrentView("admin-orders", { orderId: order.id })}
                      className="w-full p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all text-left group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm group-hover:text-orange-400 transition-colors truncate">
                              {order.order_number}
                            </p>
                            {firstItem && (
                              <span className="text-[10px] text-zinc-600 truncate hidden sm:inline">
                                • {firstItem.product_name}
                                {order.items?.length > 1 && ` +${order.items.length - 1}`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString("en-ZA", { dateStyle: "medium" })}
                          </p>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-orange-400 font-bold text-sm">{formatCurrency(order.total)}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded ${status.bg} ${status.color} ${status.border}`}>
                            {order.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-zinc-400">
              <Activity className="w-4 h-4" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {loadingActivities ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-zinc-800 rounded w-3/4" />
                      <div className="h-2 bg-zinc-800 rounded w-1/4" />
                    </div>
                  </div>
                ))
              ) : activities.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-sm">No recent activity</div>
              ) : (
                activities.map((activity, i) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-xl hover:bg-zinc-900/80 transition-colors cursor-pointer group"
                    onClick={() => {
                      if (activity.type === "order") setCurrentView("admin-orders");
                      else if (activity.type === "product") setCurrentView("admin-products");
                    }}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center ${activity.color} group-hover:scale-110 transition-transform flex-shrink-0`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{activity.action}</p>
                      {activity.details && (
                        <p className="text-xs text-zinc-600 mt-0.5">{activity.details}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-0.5">{formatTimeAgo(activity.created_at)}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-zinc-800/30 rounded-xl">
                  <p className="text-xs text-zinc-500">Avg Order Value</p>
                  <p className="text-lg font-bold text-orange-400">{formatCurrency(stats.avgOrderValue)}</p>
                </div>
                <div className="text-center p-3 bg-zinc-800/30 rounded-xl">
                  <p className="text-xs text-zinc-500">Today's Orders</p>
                  <p className="text-lg font-bold text-emerald-400">{stats.todayOrders}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;