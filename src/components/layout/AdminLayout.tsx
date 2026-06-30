// ============================================
// HOTSHOT FABRICS - ADMIN LAYOUT
// Production Ready | Protected Admin Routes
// ============================================
import { useApp } from "../../AppContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminMobileNav } from "./AdminMobileNav";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isManager, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <ShieldAlert className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">Authentication Required</h1>
          <p className="text-zinc-400 mb-6">Please sign in to access the admin panel.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-colors"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // Not admin/manager
  if (!isAdmin && !isManager) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">Access Denied</h1>
          <p className="text-zinc-400 mb-6">You do not have permission to access the admin panel.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
          >
            Back to Store
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminMobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}