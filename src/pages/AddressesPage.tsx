import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import { MapPin, Plus, X, Trash2, Star, Pencil } from "lucide-react";

export function AddressesPage() {
  const { user, toast } = useApp();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: "Home",
    full_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "South Africa",
    is_default: false
  });

  useEffect(() => {
    if (user) fetchAddresses();
    else setLoading(false);
  }, [user]);

  const fetchAddresses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", user!.id)
      .order("is_default", { ascending: false });
    if (data) setAddresses(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editingId) {
      const { error } = await supabase.from("user_addresses").update(formData).eq("id", editingId);
      if (error) toast("Error updating address", "error");
      else toast("Address updated", "success");
    } else {
      const { error } = await supabase.from("user_addresses").insert({ ...formData, user_id: user.id });
      if (error) toast("Error adding address", "error");
      else toast("Address added", "success");
    }

    setShowForm(false);
    setEditingId(null);
    resetForm();
    fetchAddresses();
  };

  const deleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    const { error } = await supabase.from("user_addresses").delete().eq("id", id);
    if (error) toast("Error deleting address", "error");
    else {
      toast("Address deleted", "success");
      fetchAddresses();
    }
  };

  const editAddress = (addr: any) => {
    setFormData({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || "",
      city: addr.city,
      state: addr.state || "",
      postal_code: addr.postal_code,
      country: addr.country,
      is_default: addr.is_default
    });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      label: "Home",
      full_name: "",
      phone: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "South Africa",
      is_default: false
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Please sign in</h2>
          <button onClick={() => useApp().setCurrentView("login")} className="px-6 py-2 bg-orange-500 rounded-lg font-bold">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black">My Addresses</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 rounded-lg font-bold text-sm"
          >
            <Plus className="w-4 h-4" /> Add New
          </motion.button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">{editingId ? "Edit Address" : "New Address"}</h2>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Label</label>
                  <select
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option>Home</option>
                    <option>Work</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Full Name *</label>
                  <input
                    type="text" required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Phone *</label>
                  <input
                    type="tel" required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-zinc-400 mb-1 block">Address Line 1 *</label>
                  <input
                    type="text" required
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-zinc-400 mb-1 block">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">City *</label>
                  <input
                    type="text" required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Province</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Postal Code *</label>
                  <input
                    type="text" required
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-700"
                  />
                  <label htmlFor="is_default" className="text-sm">Set as default address</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="px-6 py-2.5 bg-orange-500 rounded-lg font-bold">
                  {editingId ? "Update" : "Save"} Address
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-zinc-700 rounded-lg hover:border-zinc-500">
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {addresses.map((addr) => (
            <motion.div
              key={addr.id}
              layout
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">{addr.label}</span>
                    {addr.is_default && (
                      <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                        <Star className="w-3 h-3 fill-current" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{addr.full_name}</p>
                  <p className="text-sm text-zinc-400">{addr.phone}</p>
                  <p className="text-sm text-zinc-400 mt-1">{addr.address_line1}</p>
                  {addr.address_line2 && <p className="text-sm text-zinc-400">{addr.address_line2}</p>}
                  <p className="text-sm text-zinc-400">{addr.city}, {addr.state} {addr.postal_code}</p>
                  <p className="text-sm text-zinc-400">{addr.country}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editAddress(addr)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteAddress(addr.id)} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}