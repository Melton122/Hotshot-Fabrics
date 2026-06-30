// ============================================
// HOTSHOT FABRICS - MAIN APP
// Production Ready | Fixed & Enhanced
// ============================================
import { AppProvider, useApp } from "./AppContext";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { WhatsAppButton } from "./components/layout/WhatsAppButton";
import { ToastContainer } from "./components/ToastContainer";
import { ErrorBoundary, PageLoader } from "./components/ErrorBoundary";
import { AdminLayout } from "./components/layout/AdminLayout";

// Pages
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { WishlistPage } from "./pages/WishlistPage";
import { ProfilePage } from "./pages/ProfilePage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AddressesPage } from "./pages/AddressesPage";

// Info Pages
import {
  ContactUsPage, ShippingInfoPage, ReturnsExchangesPage,
  SizeGuidePage, FaqPage, PrivacyPolicyPage, TermsOfServicePage
} from "./info/InfoPages";

// Admin Pages
import { AdminHomeContent } from "./pages/admin/AdminHomeContent";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminProducts } from "./pages/admin/AdminProducts";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { AdminCustomers } from "./pages/admin/AdminCustomers";
import { AdminCategories } from "./pages/admin/AdminCategories";
import { AdminReviews } from "./pages/admin/AdminReviews";
import { AdminAnalytics } from "./pages/admin/AdminAnalytics";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { AdminBanners } from "./pages/admin/AdminBanners";
import { AdminColors } from "./pages/admin/AdminColors";
import { AdminSizes } from "./pages/admin/AdminSizes";
import { AdminCoupons } from "./pages/admin/AdminCoupons"; // 👈 NEW

import { Suspense } from "react";

function AppContent() {
  const { currentView, viewParams, toasts, dismissToast, isLoading } = useApp();

  if (isLoading) {
    return <PageLoader />;
  }

  // Admin routes – added "admin-coupons" 👇
  const adminViews = [
    "admin-dashboard", "admin-products", "admin-orders", "admin-customers",
    "admin-categories", "admin-reviews", "admin-analytics", "admin-settings",
    "admin-home", "admin-banners", "admin-colors", "admin-sizes",
    "admin-coupons" // 👈 NEW
  ];

  const isAdminRoute = adminViews.includes(currentView);

  // Render the current view
  const renderView = () => {
    switch (currentView) {
      case "home": return <HomePage />;
      case "shop": return <ShopPage />;
      case "product": return <ProductPage productSlug={viewParams.slug || ""} />;
      case "cart": return <CartPage />;
      case "checkout": return <CheckoutPage />;
      case "login": return <LoginPage />;
      case "register": return <RegisterPage />;
      case "wishlist": return <WishlistPage />;
      case "profile": return <ProfilePage />;
      case "orders": return <OrdersPage />;
      case "order-detail": return <OrderDetailPage orderId={viewParams.orderId || ""} />;
      case "dashboard": return <DashboardPage />;
      case "addresses": return <AddressesPage />;
      case "contact": return <ContactUsPage />;
      case "shipping": return <ShippingInfoPage />;
      case "returns": return <ReturnsExchangesPage />;
      case "size-guide": return <SizeGuidePage />;
      case "faq": return <FaqPage />;
      case "privacy": return <PrivacyPolicyPage />;
      case "terms": return <TermsOfServicePage />;

      // Admin
      case "admin-dashboard": return <AdminDashboard />;
      case "admin-products": return <AdminProducts />;
      case "admin-orders": return <AdminOrders />;
      case "admin-customers": return <AdminCustomers />;
      case "admin-categories": return <AdminCategories />;
      case "admin-reviews": return <AdminReviews />;
      case "admin-analytics": return <AdminAnalytics />;
      case "admin-settings": return <AdminSettings />;
      case "admin-banners": return <AdminBanners />;
      case "admin-home": return <AdminHomeContent />;
      case "admin-colors": return <AdminColors />;
      case "admin-sizes": return <AdminSizes />;
      case "admin-coupons": return <AdminCoupons />; // 👈 NEW

      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {!isAdminRoute && <Navbar />}

      <main className={isAdminRoute ? "" : "pt-0"}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            {isAdminRoute ? (
              <AdminLayout>
                {renderView()}
              </AdminLayout>
            ) : (
              renderView()
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <WhatsAppButton />}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}