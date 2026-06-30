// ============================================
// HOTSHOT FABRICS - NAVBAR
// Production Ready | Fixed & Enhanced
// ============================================
import { useState, useEffect, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import {
  ShoppingBag, Search, Menu, X, User, Heart, ChevronDown, LogOut,
  Settings, Package, MapPin, LayoutDashboard, Shield, Sparkles,
  ChevronRight, TrendingUp, Flame
} from "lucide-react";
import { useOutsideClick } from "../../hooks";

export function Navbar() {
  const { user, profile, isAdmin, isManager, cartCount, wishlistCount, setCurrentView, toast } = useApp();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [showAdminInput, setShowAdminInput] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(userMenuRef, () => setIsUserMenuOpen(false));
  useOutsideClick(megaMenuRef, () => setIsMegaMenuOpen(false));

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Search debounce
  useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(() => searchProducts(), 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (data) {
        const parentCats = data.filter((c: any) => !c.parent_id);
        const childCats = data.filter((c: any) => c.parent_id);
        const cats = parentCats.map((p: any) => ({
          ...p,
          children: childCats.filter((c: any) => c.parent_id === p.id)
        }));
        setCategories(cats);
      }
    } catch (err) {
    }
  };

  const searchProducts = async () => {
    setIsSearchLoading(true);
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, images:product_images(image_url, is_primary)")
        .eq("is_active", true)
        .ilike("name", `%${searchQuery}%`)
        .limit(6);

      if (data) setSearchResults(data);
    } catch (err) {
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleAdminShortcut = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = adminInput.trim().toLowerCase();
    if (value !== "admin") {
      setAdminInput("");
      return;
    }

    if (!user) {
      toast("Please sign in as admin", "info");
      setCurrentView("login");
    } else if (isAdmin || isManager) {
      setCurrentView("admin-dashboard");
      toast("Welcome to Admin Panel", "success");
    } else {
      toast("Admin access required", "error");
    }
    setAdminInput("");
    setShowAdminInput(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentView("home");
      toast("Logged out successfully", "success");
    } catch (err) {
      toast("Error logging out", "error");
    }
  };

  const navLinks = [
    { label: "Home", view: "home" as const },
    { label: "Shop", view: "shop" as const, hasMega: true },
    { label: "New Arrivals", view: "shop" as const, params: { filter: "new" } },
    { label: "Best Sellers", view: "shop" as const, params: { filter: "bestseller" } },
    { label: "Sale", view: "shop" as const, params: { filter: "sale" } },
  ];

  const userMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" as const },
    { icon: Package, label: "My Orders", view: "orders" as const },
    { icon: Heart, label: "Wishlist", view: "wishlist" as const, badge: wishlistCount },
    { icon: MapPin, label: "Addresses", view: "addresses" as const },
    { icon: Settings, label: "Profile Settings", view: "profile" as const },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? "bg-black/95 backdrop-blur-2xl border-b border-zinc-800/50 shadow-2xl shadow-black/20" 
            : "bg-gradient-to-b from-black/80 to-transparent"
        }`}
      >
        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-black text-xs font-bold text-center py-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4xKSIvPjwvc3ZnPg==')] opacity-30" />
          <span className="relative inline-flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            FREE SHIPPING ON ORDERS OVER R1,500 | WHATSAPP: 083 416 0993
            <Sparkles className="w-3 h-3" />
          </span>
        </div>

        {/* Main Navbar */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <motion.button
              onClick={() => setCurrentView("home")}
              className="flex items-center gap-3 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                  <span className="text-white font-black text-lg">HF</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-black tracking-tight text-white leading-none">
                  HOTSHOT<span className="text-orange-500">.</span>
                </h1>
                <p className="text-[9px] font-bold tracking-[0.35em] text-orange-400/80 uppercase">
                  Premium Fabrics
                </p>
              </div>
            </motion.button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <div key={link.label} className="relative" ref={link.hasMega ? megaMenuRef : undefined}>
                  <button
                    onClick={() => {
                      setCurrentView(link.view, link.params);
                      setIsMegaMenuOpen(false);
                    }}
                    onMouseEnter={() => link.hasMega && setIsMegaMenuOpen(true)}
                    className="px-4 py-2 text-sm font-medium transition-all rounded-lg hover:bg-white/5 hover:text-orange-400 flex items-center gap-1 group"
                  >
                    {link.label}
                    {link.hasMega && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMegaMenuOpen ? "rotate-180" : ""}`} />
                    )}
                  </button>
                </div>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSearchOpen(true)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </motion.button>

              {/* Wishlist */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => user ? setCurrentView("wishlist") : setCurrentView("login")}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all relative hidden sm:block"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-orange-500 to-orange-600 text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </motion.button>

              {/* Cart */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => user ? setCurrentView("cart") : setCurrentView("login")}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all relative"
                aria-label="Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-orange-500 to-orange-600 text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </motion.button>

              {/* User Menu */}
              {user ? (
                <div className="relative hidden sm:block" ref={userMenuRef}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md shadow-orange-500/20">
                      <span className="text-sm font-bold text-black">
                        {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`} />
                  </motion.button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-3 w-64 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                      >
                        {/* User Info */}
                        <div className="p-4 border-b border-zinc-800/80">
                          <p className="font-semibold text-sm truncate">{profile?.full_name || "User"}</p>
                          <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          )}
                        </div>

                        {/* Menu Items */}
                        <div className="p-2">
                          {userMenuItems.map((item) => (
                            <button
                              key={item.label}
                              onClick={() => { setCurrentView(item.view); setIsUserMenuOpen(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/5 rounded-xl transition-colors text-left group"
                            >
                              <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-orange-400 transition-colors" />
                              <span className="flex-1">{item.label}</span>
                              {item.badge ? (
                                <span className="px-1.5 py-0.5 bg-orange-500/10 rounded text-[10px] font-bold text-orange-400">
                                  {item.badge}
                                </span>
                              ) : null}
                            </button>
                          ))}

                          {/* Admin Panel Link - Only visible to admins */}
                          {(isAdmin || isManager) && (
                            <>
                              <div className="my-2 border-t border-zinc-800/80" />
                              <button
                                onClick={() => { setCurrentView("admin-dashboard"); setIsUserMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-orange-500/10 rounded-xl transition-colors text-left group text-orange-400"
                              >
                                <Shield className="w-4 h-4" />
                                <span className="flex-1 font-semibold">Admin Panel</span>
                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </>
                          )}

                          <div className="my-2 border-t border-zinc-800/80" />
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-red-500/10 rounded-xl transition-colors text-left group text-red-400"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentView("login")}
                  className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20"
                >
                  <User className="w-4 h-4" /> Sign In
                </motion.button>
              )}

              {/* Mobile Menu Toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all lg:hidden"
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mega Menu */}
        <AnimatePresence>
          {isMegaMenuOpen && categories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onMouseEnter={() => setIsMegaMenuOpen(true)}
              onMouseLeave={() => setIsMegaMenuOpen(false)}
              className="absolute top-full left-0 right-0 bg-zinc-900/98 backdrop-blur-xl border-t border-zinc-800/50 shadow-2xl overflow-hidden"
            >
              <div className="max-w-[1440px] mx-auto px-8 py-8">
                <div className="grid grid-cols-4 gap-8">
                  {categories.slice(0, 4).map((cat) => (
                    <div key={cat.id}>
                      <h3 className="font-bold text-base mb-4 text-orange-500 flex items-center gap-2">
                        <Flame className="w-4 h-4" />
                        {cat.name}
                      </h3>
                      <ul className="space-y-2.5">
                        {cat.children?.slice(0, 4).map((child: any) => (
                          <li key={child.id}>
                            <button
                              onClick={() => { setCurrentView("shop"); setIsMegaMenuOpen(false); }}
                              className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2 group"
                            >
                              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                              {child.name}
                            </button>
                          </li>
                        ))}
                        <li>
                          <button
                            onClick={() => { setCurrentView("shop"); setIsMegaMenuOpen(false); }}
                            className="text-sm text-orange-400 hover:text-orange-300 transition-colors font-medium flex items-center gap-2"
                          >
                            View All {cat.name} →
                          </button>
                        </li>
                      </ul>
                    </div>
                  ))}
                  <div className="col-span-1">
                    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl p-5 border border-zinc-700/50">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-3">
                        <TrendingUp className="w-6 h-6 text-orange-500" />
                      </div>
                      <p className="font-bold text-sm mb-1">Summer Collection</p>
                      <p className="text-xs text-zinc-400 mb-3">New arrivals up to 30% off</p>
                      <button 
                        onClick={() => { setCurrentView("shop"); setIsMegaMenuOpen(false); }}
                        className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        Shop Now →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl"
            onClick={() => setIsSearchOpen(false)}
          >
            <div className="max-w-3xl mx-auto px-4 pt-24" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                  {isSearchLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setIsSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
                  className="p-3 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Search Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="space-y-2"
                  >
                    <p className="text-sm text-zinc-500 mb-3">{searchResults.length} results found</p>
                    {searchResults.map((product) => (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => {
                          setCurrentView("product", { slug: product.slug });
                          setIsSearchOpen(false);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl transition-all text-left group"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                          <img
                            src={product.images?.[0]?.image_url || "https://via.placeholder.com/80"}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-orange-400 transition-colors">{product.name}</p>
                          <p className="text-orange-400 font-bold">R{product.price}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-orange-400 transition-colors" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {searchQuery.length > 2 && searchResults.length === 0 && !isSearchLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                    <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400">No products found for "{searchQuery}"</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-zinc-950"
          >
            <div className="p-4 h-full overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-black text-sm">HF</span>
                  </div>
                  <span className="font-black text-lg">HOTSHOT</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Admin Shortcut (hidden) */}
              <form onSubmit={handleAdminShortcut} className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    placeholder="Type 'admin' for access..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </form>

              {/* Navigation */}
              <div className="space-y-1">
                {[
                  { label: "Home", view: "home" },
                  { label: "Shop All", view: "shop" },
                  { label: "New Arrivals", view: "shop", params: { filter: "new" } },
                  { label: "Best Sellers", view: "shop", params: { filter: "bestseller" } },
                  { label: "Sale", view: "shop", params: { filter: "sale" } },
                  { label: "Contact Us", view: "contact" },
                  { label: "FAQ", view: "faq" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setCurrentView(item.view as any, item.params); setIsMobileMenuOpen(false); }}
                    className="w-full text-left px-4 py-3.5 text-lg font-medium hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between group"
                  >
                    {item.label}
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Account Section */}
              <div className="border-t border-zinc-800 mt-6 pt-6">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-4 px-4">Account</p>
                <div className="space-y-1">
                  {user ? (
                    <>
                      <button onClick={() => { setCurrentView("dashboard"); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                        <LayoutDashboard className="w-5 h-5" /> Dashboard
                      </button>
                      <button onClick={() => { setCurrentView("orders"); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                        <Package className="w-5 h-5" /> My Orders
                      </button>
                      <button onClick={() => { setCurrentView("wishlist"); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                        <Heart className="w-5 h-5" /> Wishlist ({wishlistCount})
                      </button>
                      <button onClick={() => { setCurrentView("cart"); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                        <ShoppingBag className="w-5 h-5" /> Cart ({cartCount})
                      </button>
                      <button onClick={() => { setCurrentView("addresses"); setIsMobileMenuOpen(false); }} className="mobile-menu-item">
                        <MapPin className="w-5 h-5" /> Addresses
                      </button>
                      {(isAdmin || isManager) && (
                        <button onClick={() => { setCurrentView("admin-dashboard"); setIsMobileMenuOpen(false); }} className="mobile-menu-item text-orange-400">
                          <Shield className="w-5 h-5" /> Admin Panel
                        </button>
                      )}
                      <div className="border-t border-zinc-800 mt-2 pt-2">
                        <button onClick={handleLogout} className="mobile-menu-item text-red-400">
                          <LogOut className="w-5 h-5" /> Logout
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => { setCurrentView("login"); setIsMobileMenuOpen(false); }}
                      className="w-full px-4 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-center font-bold"
                    >
                      Sign In / Register
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}