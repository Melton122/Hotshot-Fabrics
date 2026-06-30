// ============================================
// HOTSHOT FABRICS - ADMIN SIZES
// Production Ready | Size Management
// ============================================
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import { Plus, Edit, Trash2, X } from "lucide-react";

interface SizeItem {
  id: string;
  name: string;
  sort_order: number;
}

export function AdminSizes() {
  const { toast } = useApp();
  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSize, setEditingSize] = useState<SizeItem | null>(null);
  const [formData, setFormData] = useState({ name: "", sort_order: "0" });

  useEffect(() => {
    fetchSizes();
  }, []);

  const fetchSizes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("sizes").select("*").order("sort_order");
      if (error) throw error;
      setSizes(data || []);
    } catch {
      toast("Error loading sizes", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { name: formData.name, sort_order: parseInt(formData.sort_order) || 0 };
      if (editingSize) {
        const { error } = await supabase.from("sizes").update(data).eq("id", editingSize.id);
        if (error) throw error;
        toast("Size updated", "success");
      } else {
        const { error } = await supabase.from("sizes").insert(data);
        if (error) throw error;
        toast("Size created", "success");
      }
      setShowForm(false);
      setEditingSize(null);
      setFormData({ name: "", sort_order: "0" });
      fetchSizes();
    } catch {
      toast("Error saving size", "error");
    }
  };

  const deleteSize = async (id: string) => {
    if (!confirm("Delete this size?")) return;
    try {
      const { error } = await supabase.from("sizes").delete().eq("id", id);
      if (error) throw error;
      toast("Size deleted", "success");
      fetchSizes();
    } catch {
      toast("Error deleting size", "error");
    }
  };

  const editSizeHandler = (size: SizeItem) => {
    setEditingSize(size);
    setFormData({ name: size.name, sort_order: size.sort_order?.toString() || "0" });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Sizes</h1>
          <p className="text-zinc-400 mt-1">Manage product sizes</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowForm(true);
            setEditingSize(null);
            setFormData({ name: "", sort_order: "0" });
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" /> Add Size
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mb-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">{editingSize ? "Edit Size" : "New Size"}</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500"
                  placeholder="XS, S, M, L, XL..."
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="px-6 py-2.5 bg-orange-500 rounded-xl font-bold">
                {editingSize ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 border border-zinc-700 rounded-xl hover:border-zinc-500"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-4">
          {sizes.map((size) => (
            <motion.div
              key={size.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-center group hover:border-zinc-700 transition-colors"
            >
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="font-black text-lg">{size.name}</span>
              </div>
              <p className="text-xs text-zinc-500">Order: {size.sort_order}</p>
              <div className="flex justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => editSizeHandler(size)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteSize(size.id)}
                  className="p-1 hover:bg-red-500/10 hover:text-red-400 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
