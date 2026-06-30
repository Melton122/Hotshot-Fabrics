// ============================================
// HOTSHOT FABRICS - ADMIN SIDEBAR
// Production Ready
// ============================================
import { useApp } from "../../AppContext";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Settings,
  Heart, BarChart3, ShieldCheck, Sparkles, Image, Palette,
  Ruler, ChevronLeft, Megaphone
} from "lucide-react";

export function AdminSidebar() {
  const { setCurrentView, currentView, isAdmin } = useApp();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", view: "admin-dashboard" as const },
    { icon: Package, label: "Products", view: "admin-products" as const },
    { icon: ShoppingBag, label: "Orders", view: "admin-orders" as const },
    { icon: Users, label: "Customers", view: "admin-customers" as const },
    { icon: Settings, label: "Categories", view: "admin-categories" as const },
    { icon: Heart, label: "Reviews", view: "admin-reviews" as const },
    { icon: Image, label: "Banners", view: "admin-banners" as const },
    { icon: Megaphone, label: "Home Content", view: "admin-home" as const },
    { icon: Palette, label: "Colors", view: "admin-colors" as const },
    { icon: Ruler, label: "Sizes", view: "admin-sizes" as const },
    { icon: BarChart3, label: "Analytics", view: "admin-analytics" as const },
    { icon: ShieldCheck, label: "Settings", view: "admin-settings" as const },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-zinc-950 border-r border-zinc-900 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-zinc-900">
        <button
          onClick={() => setCurrentView("admin-dashboard")}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
            <ShieldCheck className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight">Admin</span>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Hotshot Fabrics</p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-4 mb-2">Management</p>
        {menuItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              currentView === item.view
                ? "bg-gradient-to-r from-orange-500/10 to-orange-500/5 text-orange-400 border border-orange-500/20 shadow-sm shadow-orange-500/10"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentView === item.view ? "text-orange-400" : "text-zinc-500"}`} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Back to Store */}
      <div className="p-4 border-t border-zinc-900">
        <button
          onClick={() => setCurrentView("home")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Store
        </button>
      </div>
    </aside>
  );
}