// ============================================
// HOTSHOT FABRICS - APP CONTEXT & PROVIDER
// Production Ready | Fixed & Enhanced
// ============================================
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "./utils/supabaseClient";
import type { User, Session } from "@supabase/supabase-js";

export type ViewType = 
  | "home" | "shop" | "product" | "cart" | "checkout" 
  | "login" | "register" | "wishlist" | "profile" 
  | "orders" | "order-detail" | "dashboard" | "addresses"
  | "contact" | "shipping" | "returns" | "size-guide" | "faq" | "privacy" | "terms"
  | "admin-dashboard" | "admin-products" | "admin-orders" | "admin-customers"
  | "admin-categories" | "admin-reviews" | "admin-analytics" | "admin-settings"
  | "admin-home" | "admin-banners" | "admin-colors" | "admin-sizes"
  | "admin-coupons"; // 👈 ADD THIS

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface AppContextType {
  user: User | null;
  profile: any | null;
  session: Session | null;
  isAdmin: boolean;
  isManager: boolean;
  cartCount: number;
  wishlistCount: number;
  wishlistItems: string[];
  currentView: ViewType;
  viewParams: Record<string, any>;
  toasts: Toast[];
  isLoading: boolean;
  setCurrentView: (view: ViewType, params?: Record<string, any>) => void;
  setViewParams: (params: Record<string, any>) => void;
  toast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshCounts: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentViewState] = useState<ViewType>("home");
  const [viewParams, setViewParamsState] = useState<Record<string, any>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toastTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isAdmin = profile?.role === "admin";
  const isManager = profile?.role === "manager" || isAdmin;

  // Toast system with auto-dismiss
  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    const timeout = setTimeout(() => {
      dismissToast(id);
    }, 5000);

    toastTimeoutRef.current.set(id, timeout);
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timeout = toastTimeoutRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      toastTimeoutRef.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Navigation
  const setCurrentView = useCallback((view: ViewType, params?: Record<string, any>) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentViewState(view);
    setViewParamsState(params || {});

    // Update URL for shareability (optional)
    const urlMap: Record<string, string> = {
      home: "/", shop: "/shop", cart: "/cart", checkout: "/checkout",
      login: "/login", register: "/register", wishlist: "/wishlist",
      profile: "/profile", orders: "/orders", dashboard: "/dashboard",
      addresses: "/addresses", "admin-dashboard": "/admin",
    };

    if (urlMap[view]) {
      window.history.replaceState({}, "", urlMap[view]);
    }
  }, []);

  const setViewParams = useCallback((params: Record<string, any>) => {
    setViewParamsState(prev => ({ ...prev, ...params }));
  }, []);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Create default profile if missing
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { error: insertError } = await supabase
            .from("user_profiles")
            .insert({
              id: userId,
              email: userData.user.email,
              role: "customer",
              full_name: userData.user.user_metadata?.full_name || "",
            })
            .select()
            .single();

          if (!insertError) {
            setProfile(insertError ? null : { id: userId, email: userData.user.email, role: "customer" });
          }
        }
        return;
      }

      setProfile(data);
    } catch (err) {
    }
  }, []);

  // Refresh counts
  const refreshCounts = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      setWishlistCount(0);
      return;
    }

    try {
      const [{ count: cart }, { data: wishlistData }] = await Promise.all([
        supabase.from("cart_items").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("wishlist").select("product_id").eq("user_id", user.id),
      ]);
      setCartCount(cart || 0);
      if (wishlistData) {
        setWishlistItems(wishlistData.map(w => w.product_id));
        setWishlistCount(wishlistData.length);
      } else {
        setWishlistItems([]);
        setWishlistCount(0);
      }
    } catch (err) {
    }
  }, [user]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
    await refreshCounts();
  }, [user, fetchProfile, refreshCounts]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      setCartCount(0);
      setWishlistCount(0);
      setWishlistItems([]);
      setCurrentView("home");
      toast("Signed out successfully", "success");
    } catch (err) {
      toast("Error signing out", "error");
    }
  }, [toast]);

  // Auth state listener
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user || null);

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (err) {
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      // Clear all toast timeouts
      toastTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      toastTimeoutRef.current.clear();
    };
  }, [fetchProfile]);

  // Refresh counts when user changes
  useEffect(() => {
    refreshCounts();
  }, [user, refreshCounts]);

  // Realtime cart/wishlist updates
  useEffect(() => {
    if (!user) return;

    const cartChannel = supabase
      .channel("cart_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${user.id}` }, refreshCounts)
      .subscribe();

    const wishlistChannel = supabase
      .channel("wishlist_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishlist", filter: `user_id=eq.${user.id}` }, refreshCounts)
      .subscribe();

    return () => {
      cartChannel.unsubscribe();
      wishlistChannel.unsubscribe();
    };
  }, [user, refreshCounts]);

  const value: AppContextType = {
    user, profile, session, isAdmin, isManager,
    cartCount, wishlistCount, wishlistItems,
    currentView, viewParams, toasts, isLoading,
    setCurrentView, setViewParams,
    toast, dismissToast,
    logout, refreshUser, refreshCounts,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export { supabase } from "./utils/supabaseClient";