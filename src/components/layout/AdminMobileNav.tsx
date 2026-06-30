// ============================================
// HOTSHOT FABRICS - ADMIN MOBILE NAV
// Production Ready | Mobile Navigation
// ============================================
import { useApp } from "../../AppContext";
import { useState } from "react";
import {
  LayoutDashboard, Package, ShoppingBag, User, Settings,
  Heart, Sparkles, ShieldCheck, Menu, X, Home, Megaphone
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ViewType } from "../../AppContext";

export function AdminMobileNav() {
  const { setCurrentView, currentView } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems: { icon: any; label: string; view: ViewType }[] = [
    { icon: LayoutDashboard, label: "Dashboard", view: "admin-dashboard" },
    { icon: Package, label: "Products", view: "admin-products" },
    { icon: ShoppingBag, label: "Orders", view: "admin-orders" },
    { icon: User, label: "Customers", view: "admin-customers" },
    { icon: Settings, label: "Categories", view: "admin-categories" },
    { icon: Heart, label: "Reviews", view: "admin-reviews" },
    { icon: Sparkles, label: "Banners", view: "admin-banners" },
    { icon: Megaphone, label: "Home Content", view: "admin-home" },
    { icon: Sparkles, label: "Analytics", view: "admin-analytics" },
    { icon: ShieldCheck, label: "Settings", view: "admin-settings" },
  ];

  return (
    <div className="lg:hidden bg-zinc-950 border-b border-zinc-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <button
        onClick={() => setCurrentView("admin-dashboard")}
        className="flex items-center gap-2"
      >
        <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-black" />
        </div>
        <span className="font-black">Admin</span>
      </button>

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-zinc-950 border-b border-zinc-900 p-4 space-y-1"
          >
            {menuItems.map((item) => (
              <button
                key={item.view}
                onClick={() => { setCurrentView(item.view); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentView === item.view
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
            <button
              onClick={() => { setCurrentView("home"); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <Home className="w-5 h-5" />
              Back to Store
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}