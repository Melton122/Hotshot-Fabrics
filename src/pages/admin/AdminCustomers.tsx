// ============================================
// HOTSHOT FABRICS - ADMIN CUSTOMERS
// Production Ready | Customer Management
// ============================================
import { useState, useEffect, useCallback } from "react";
import { useApp, supabase } from "../../AppContext";
import {
  Search, User, ShoppingBag, Phone, Eye
} from "lucide-react";

export function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("user_profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const viewCustomerDetail = async (customer: any) => {
    setSelectedCustomer(customer);
    setShowDetail(true);

    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setCustomerOrders(data || []);
    } catch (err) {
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black">Customers</h1>
          <p className="text-zinc-400 mt-1">{customers.length} registered customers</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 w-72 transition-colors"
          />
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-sm font-semibold text-zinc-400">Customer</th>
                <th className="text-left p-4 text-sm font-semibold text-zinc-400">Contact</th>
                <th className="text-left p-4 text-sm font-semibold text-zinc-400">Orders</th>
                <th className="text-left p-4 text-sm font-semibold text-zinc-400">Total Spent</th>
                <th className="text-left p-4 text-sm font-semibold text-zinc-400">Joined</th>
                <th className="text-right p-4 text-sm font-semibold text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td colSpan={6} className="p-4">
                      <div className="h-12 bg-zinc-800/50 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <User className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No customers found</p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-zinc-800/50 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                          <span className="font-bold text-sm text-black">
                            {customer.full_name?.[0]?.toUpperCase() || customer.email[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{customer.full_name || "No Name"}</p>
                          <p className="text-xs text-zinc-500">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-zinc-400">
                      {customer.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {customer.phone}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="p-4 text-sm">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" /> {customer.total_orders || 0}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-bold text-orange-400">
                      R{(customer.total_spent || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-sm text-zinc-400">
                      {new Date(customer.created_at).toLocaleDateString("en-ZA")}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => viewCustomerDetail(customer)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}