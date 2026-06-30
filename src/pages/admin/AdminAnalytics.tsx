import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import {
  TrendingUp, DollarSign, ShoppingBag, Users, Package,
  BarChart3, Download, Filter, ChevronDown,
  ArrowUpRight, ArrowDownRight, Target, Activity,
  PieChart, LineChart, RefreshCw, Sparkles, AlertCircle
} from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  topProducts: any[];
  recentSales: any[];
  categoryBreakdown: { name: string; revenue: number; orders: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  customerGrowth: { date: string; count: number }[];
  revenueByPaymentMethod: { method: string; amount: number }[];
  monthlyComparison: { month: string; revenue: number; orders: number }[];
}

export function AdminAnalytics() {
  const { toast } = useApp();
  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0, totalOrders: 0, totalCustomers: 0, avgOrderValue: 0,
    topProducts: [], recentSales: [], categoryBreakdown: [], dailyRevenue: [], 
    customerGrowth: [], revenueByPaymentMethod: [], monthlyComparison: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "customers" | "revenue">("overview");
  const realtimeRef = useRef<any>(null);

  const getDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case "1y": return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default: return "1970-01-01T00:00:00Z";
    }
  };

  const fetchAnalytics = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const startDate = getDateRange(dateRange);

    try {
      // Fetch orders with items for better product analysis
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id, order_number, created_at, total, status, payment_status, payment_method,
          subtotal, shipping_cost, discount_applied, coupon_code,
          items:order_items(id, product_id, product_name, quantity, unit_price, total_price)
        `)
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const deliveredOrders = (ordersData || []).filter(o => o.status === "delivered");
      const allOrders = ordersData || [];
      
      // Calculate revenue metrics
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalOrders = allOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get customer count
      const { count: customersCount } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "customer");

      // Process top products from order items
      const productSales = new Map();
      allOrders.forEach(order => {
        if (order.items) {
          order.items.forEach((item: any) => {
            const existing = productSales.get(item.product_id) || { 
              name: item.product_name, 
              sales: 0, 
              revenue: 0,
              quantity: 0 
            };
            existing.sales += 1;
            existing.revenue += item.total_price || 0;
            existing.quantity += item.quantity || 0;
            productSales.set(item.product_id, existing);
          });
        }
      });
      
      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(p => ({ ...p, total_revenue: p.revenue, total_sales: p.quantity }));

      // Process recent sales
      const recentSales = allOrders.slice(0, 20).map(o => ({
        order_number: o.order_number,
        created_at: o.created_at,
        total: o.total,
        status: o.status,
        payment_status: o.payment_status
      }));

      // Process daily revenue
      const dailyMap = new Map<string, { revenue: number; orders: number }>();
      deliveredOrders.forEach((o: any) => {
        const date = new Date(o.created_at).toISOString().split("T")[0];
        const existing = dailyMap.get(date) || { revenue: 0, orders: 0 };
        dailyMap.set(date, { 
          revenue: existing.revenue + (o.total || 0), 
          orders: existing.orders + 1 
        });
      });
      
      const dailyRevenue = Array.from(dailyMap.entries())
        .map(([date, val]) => ({ date, ...val }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Process customer growth
      const { data: customersData } = await supabase
        .from("user_profiles")
        .select("created_at")
        .eq("role", "customer")
        .gte("created_at", startDate)
        .order("created_at");

      const customerMap = new Map<string, number>();
      (customersData || []).forEach((u: any) => {
        const date = new Date(u.created_at).toISOString().split("T")[0];
        customerMap.set(date, (customerMap.get(date) || 0) + 1);
      });
      
      const customerGrowth = Array.from(customerMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Process revenue by payment method
      const paymentMethodMap = new Map<string, number>();
      deliveredOrders.forEach(o => {
        const method = o.payment_method || "unknown";
        paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + (o.total || 0));
      });
      
      const revenueByPaymentMethod = Array.from(paymentMethodMap.entries())
        .map(([method, amount]) => ({ method, amount }))
        .sort((a, b) => b.amount - a.amount);

      // Process monthly comparison
      const monthlyMap = new Map<string, { revenue: number; orders: number }>();
      deliveredOrders.forEach(o => {
        const date = new Date(o.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyMap.get(monthKey) || { revenue: 0, orders: 0 };
        monthlyMap.set(monthKey, {
          revenue: existing.revenue + (o.total || 0),
          orders: existing.orders + 1
        });
      });
      
      const monthlyComparison = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      // Process category breakdown
      const categoryMap = new Map<string, { name: string; revenue: number; orders: number }>();
      
      for (const order of allOrders) {
        if (order.items) {
          for (const item of order.items) {
            // Fetch product category
            const { data: productData } = await supabase
              .from("products")
              .select("category:categories(name)")
              .eq("id", item.product_id)
              .single();
            
            const categoryName = productData?.category?.[0]?.name || "Uncategorized";
            const existing = categoryMap.get(categoryName) || { 
              name: categoryName, 
              revenue: 0, 
              orders: 0 
            };
            existing.revenue += item.total_price || 0;
            existing.orders += 1;
            categoryMap.set(categoryName, existing);
          }
        }
      }
      
      const categoryBreakdown = Array.from(categoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      setData({
        totalRevenue,
        totalOrders,
        totalCustomers: customersCount || 0,
        avgOrderValue,
        topProducts,
        recentSales,
        categoryBreakdown,
        dailyRevenue,
        customerGrowth,
        revenueByPaymentMethod,
        monthlyComparison
      });
    } catch (err) {
      toast("Failed to load analytics", "error");
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  // Real-time subscriptions
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-analytics-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchAnalytics(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        fetchAnalytics(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, () => {
        fetchAnalytics(false);
      })
      .subscribe();

    realtimeRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [fetchAnalytics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalytics();
    setIsRefreshing(false);
    toast("Analytics refreshed", "success");
  };

  const handleExport = () => {
    const csvRows = [
      ["Metric", "Value"],
      ["Total Revenue", `R${data.totalRevenue.toFixed(2)}`],
      ["Total Orders", data.totalOrders.toString()],
      ["Total Customers", data.totalCustomers.toString()],
      ["Avg Order Value", `R${data.avgOrderValue.toFixed(2)}`],
      [],
      ["Top Products"],
      ["Product", "Revenue", "Sales"],
      ...data.topProducts.map(p => [p.name, `R${p.revenue?.toFixed(2) || 0}`, p.total_sales?.toString() || "0"]),
      [],
      ["Recent Orders"],
      ["Order #", "Date", "Total", "Status"],
      ...data.recentSales.map(s => [s.order_number, new Date(s.created_at).toLocaleDateString(), `R${(s.total || 0).toFixed(2)}`, s.status])
    ];
    
    const csv = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Report exported", "success");
  };

  const formatCurrency = (value: number) => `R${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (value: number) => value?.toLocaleString() || "0";

  const statCards = [
    { icon: DollarSign, label: "Total Revenue", value: formatCurrency(data.totalRevenue), color: "bg-emerald-500/10 text-emerald-400", trend: "+12.5%" },
    { icon: ShoppingBag, label: "Total Orders", value: formatNumber(data.totalOrders), color: "bg-blue-500/10 text-blue-400", trend: "+8.3%" },
    { icon: Users, label: "Customers", value: formatNumber(data.totalCustomers), color: "bg-purple-500/10 text-purple-400", trend: "+5.1%" },
    { icon: TrendingUp, label: "Avg Order Value", value: formatCurrency(data.avgOrderValue), color: "bg-orange-500/10 text-orange-400", trend: "+3.2%" },
  ];

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "products" as const, label: "Products", icon: Package },
    { id: "customers" as const, label: "Customers", icon: Users },
    { id: "revenue" as const, label: "Revenue", icon: LineChart },
  ];

  // Get max revenue for chart scaling
  const maxDailyRevenue = Math.max(...data.dailyRevenue.map(d => d.revenue), 1);
  const maxCustomerGrowth = Math.max(...data.customerGrowth.map(d => d.count), 1);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black">Analytics</h1>
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-zinc-400 mt-1">Deep insights into your store performance</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-zinc-400 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-all text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>

          <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
            {(["7d", "30d", "90d", "1y", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === range
                    ? "bg-orange-500 text-black font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : range === "1y" ? "1 Year" : "All Time"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-orange-500 text-black font-bold"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5 px-2 py-1 bg-emerald-500/10 rounded-lg">
                <ArrowUpRight className="w-3 h-3" /> {stat.trend}
              </span>
            </div>
            <p className="text-3xl font-black">{stat.value}</p>
            <p className="text-sm text-zinc-400 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Top Products */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" /> Top Products
              </h2>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-zinc-800/50 rounded-xl animate-pulse" />
                  ))
                ) : data.topProducts.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <Package className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
                    No product data yet
                  </div>
                ) : (
                  data.topProducts.map((product, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-sm font-bold text-orange-400">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-zinc-500">{product.total_sales || 0} sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-400">{formatCurrency(product.total_revenue || 0)}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Sales */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" /> Recent Sales
              </h2>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-zinc-800/50 rounded-xl animate-pulse" />
                  ))
                ) : data.recentSales.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
                    No sales yet
                  </div>
                ) : (
                  data.recentSales.map((sale, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{sale.order_number}</p>
                        <p className="text-xs text-zinc-500">{new Date(sale.created_at).toLocaleDateString("en-ZA")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-400">{formatCurrency(sale.total)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          sale.status === "delivered" ? "bg-emerald-500/10 text-emerald-400" :
                          sale.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                          "bg-zinc-800 text-zinc-400"
                        }`}>
                          {sale.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "revenue" && (
          <motion.div
            key="revenue"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Daily Revenue Chart */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-orange-500" /> Daily Revenue
              </h2>
              <div className="h-64">
                {data.dailyRevenue.length > 0 ? (
                  <>
                    <div className="h-52 flex items-end justify-between gap-2">
                      {data.dailyRevenue.map((day, i) => {
                        const height = (day.revenue / maxDailyRevenue) * 100;
                        return (
                          <motion.div
                            key={day.date}
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(height, 2)}%` }}
                            transition={{ delay: i * 0.02, duration: 0.5, type: "spring" }}
                            className="flex-1 bg-gradient-to-t from-orange-500/40 to-orange-500/10 rounded-t-lg hover:from-orange-500/60 transition-all cursor-pointer relative group min-w-[20px]"
                          >
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 px-2 py-1 rounded-lg text-xs whitespace-nowrap border border-zinc-700 shadow-lg z-10">
                              <p className="font-bold">{formatCurrency(day.revenue)}</p>
                              <p className="text-zinc-500">{day.orders} orders</p>
                              <p className="text-zinc-600">{day.date}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-4 px-2">
                      {data.dailyRevenue.slice(0, Math.min(data.dailyRevenue.length, 12)).map((d, i) => (
                        <span key={i} className="text-[10px] text-zinc-600">
                          {d.date.slice(5)}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-52 flex items-center justify-center text-zinc-500">
                    <AlertCircle className="w-8 h-8 mr-2" /> No revenue data for this period
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Payment Method */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <CreditCardIcon className="w-5 h-5 text-orange-500" /> Payment Methods
                </h2>
                <div className="space-y-3">
                  {data.revenueByPaymentMethod.map((method, i) => {
                    const percentage = data.totalRevenue > 0 ? (method.amount / data.totalRevenue) * 100 : 0;
                    return (
                      <div key={method.method} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400 capitalize">{method.method.replace(/_/g, " ")}</span>
                          <span className="text-white font-medium">{formatCurrency(method.amount)} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {data.revenueByPaymentMethod.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">No payment data available</div>
                  )}
                </div>
              </div>

              {/* Monthly Comparison */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-500" /> Monthly Comparison
                </h2>
                <div className="space-y-3">
                  {data.monthlyComparison.map((month, i) => {
                    const maxRevenue = Math.max(...data.monthlyComparison.map(m => m.revenue), 1);
                    const percentage = (month.revenue / maxRevenue) * 100;
                    const [year, monthNum] = month.month.split("-");
                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString("default", { month: "short" });
                    return (
                      <div key={month.month} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">{monthName} {year}</span>
                          <div className="flex gap-3">
                            <span className="text-emerald-400 text-xs">{month.orders} orders</span>
                            <span className="text-white font-medium">{formatCurrency(month.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {data.monthlyComparison.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">No monthly data available</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "customers" && (
          <motion.div
            key="customers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6"
          >
            <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" /> Customer Growth
            </h2>
            <div className="h-64">
              {data.customerGrowth.length > 0 ? (
                <>
                  <div className="h-52 flex items-end justify-between gap-2">
                    {data.customerGrowth.map((day, i) => {
                      const height = (day.count / maxCustomerGrowth) * 100;
                      return (
                        <motion.div
                          key={day.date}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(height, 2)}%` }}
                          transition={{ delay: i * 0.02, duration: 0.5, type: "spring" }}
                          className="flex-1 bg-gradient-to-t from-purple-500/40 to-purple-500/10 rounded-t-lg hover:from-purple-500/60 transition-all cursor-pointer relative group min-w-[20px]"
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 px-2 py-1 rounded-lg text-xs whitespace-nowrap border border-zinc-700 shadow-lg">
                            +{day.count} new customers on {day.date}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-4 px-2">
                    {data.customerGrowth.slice(0, Math.min(data.customerGrowth.length, 12)).map((d, i) => (
                      <span key={i} className="text-[10px] text-zinc-600">
                        {d.date.slice(5)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-52 flex items-center justify-center text-zinc-500">
                  <AlertCircle className="w-8 h-8 mr-2" /> No customer data for this period
                </div>
              )}
            </div>
            
            {/* Customer Stats */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-zinc-800">
              <div className="text-center p-4 bg-zinc-800/30 rounded-xl">
                <p className="text-2xl font-black text-purple-400">{formatNumber(data.totalCustomers)}</p>
                <p className="text-xs text-zinc-500">Total Customers</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/30 rounded-xl">
                <p className="text-2xl font-black text-orange-400">{data.totalOrders > 0 && data.totalCustomers > 0 ? ((data.totalOrders / data.totalCustomers)).toFixed(1) : "0"}</p>
                <p className="text-xs text-zinc-500">Avg Orders per Customer</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "products" && (
          <motion.div
            key="products"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-orange-500" /> Product Performance
              </h2>
              <div className="space-y-4">
                {data.topProducts.map((product, i) => {
                  const maxRevenue = data.topProducts[0]?.total_revenue || 1;
                  const percentage = (product.total_revenue / maxRevenue) * 100;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-sm font-bold text-orange-400">
                            {i + 1}
                          </span>
                          <span className="font-medium text-sm">{product.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-orange-400">{formatCurrency(product.total_revenue || 0)}</span>
                          <span className="text-xs text-zinc-500 ml-2">({product.total_sales || 0} sold)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                        />
                      </div>
                    </motion.div>
                  );
                })}
                {data.topProducts.length === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                    No product sales data available
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown */}
            {data.categoryBreakdown.length > 0 && (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" /> Category Breakdown
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.categoryBreakdown.map((category, i) => {
                    const maxRevenue = Math.max(...data.categoryBreakdown.map(c => c.revenue), 1);
                    const percentage = (category.revenue / maxRevenue) * 100;
                    return (
                      <div key={category.name} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">{category.name}</span>
                          <span className="text-white font-medium">{formatCurrency(category.revenue)}</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                          />
                        </div>
                        <p className="text-xs text-zinc-500">{category.orders} orders</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Missing icon component
function CreditCardIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
  );
}

function Calendar(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}