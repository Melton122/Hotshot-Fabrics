// ============================================
// HOTSHOT FABRICS - ADMIN COLORS
// Production Ready | Color Management
// ============================================
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import { Plus, Edit, Trash2, X, } from "lucide-react";

export function AdminColors() {
  const { toast } = useApp();
  const [colors, setColors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingColor, setEditingColor] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", hex_code: "#000000", sort_order: "0" });

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("colors").select("*").order("sort_order");
      if (error) throw error;
      setColors(data || []);
    } catch (err) {
      toast("Error loading colors", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        hex_code: formData.hex_code,
        sort_order: parseInt(formData.sort_order) || 0
      };

      if (editingColor) {
        const { error } = await supabase.from("colors").update(data).eq("id", editingColor.id);
        if (error) throw error;
        toast("Color updated", "success");
      } else {
        const { error } = await supabase.from("colors").insert(data);
        if (error) throw error;
        toast("Color created", "success");
      }

      setShowForm(false);
      setEditingColor(null);
      setFormData({ name: "", hex_code: "#000000", sort_order: "0" });
      fetchColors();
    } catch (err) {
      toast("Error saving color", "error");
    }
  };

  const deleteColor = async (id: string) => {
    if (!confirm("Delete this color? It may be used by products.")) return;
    try {
      const { error } = await supabase.from("colors").delete().eq("id", id);
      if (error) throw error;
      toast("Color deleted", "success");
      fetchColors();
    } catch (err) {
      toast("Error deleting color", "error");
    }
  };

  const editColor = (color: any) => {
    setEditingColor(color);
    setFormData({ name: color.name, hex_code: color.hex_code, sort_order: color.sort_order?.toString() || "0" });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Colors</h1>
          <p className="text-zinc-400 mt-1">Manage product colors</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setShowForm(true); setEditingColor(null); setFormData({ name: "", hex_code: "#000000", sort_order: "0" }); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" /> Add Color
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
              <h2 className="font-bold">{editingColor ? "Edit Color" : "New Color"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Name *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Hex Code *</label>
                <div className="flex gap-2">
                  <input type="color" value={formData.hex_code} onChange={e => setFormData({...formData, hex_code: e.target.value})} className="w-12 h-10 rounded-lg border border-zinc-800 bg-black cursor-pointer" />
                  <input type="text" required value={formData.hex_code} onChange={e => setFormData({...formData, hex_code: e.target.value})} className="flex-1 px-4 py-2.5 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 uppercase" />
                </div>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Sort Order</label>
                <input type="number" value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: e.target.value})} className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="px-6 py-2.5 bg-orange-500 rounded-xl font-bold">{editingColor ? "Update" : "Create"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-zinc-700 rounded-xl hover:border-zinc-500">Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-900/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {colors.map((color) => (
            <motion.div
              key={color.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 group hover:border-zinc-700 transition-colors"
            >
              <div className="w-full h-16 rounded-xl mb-3 border border-zinc-800" style={{ backgroundColor: color.hex_code }} />
              <p className="font-semibold text-sm">{color.name}</p>
              <p className="text-xs text-zinc-500 font-mono">{color.hex_code}</p>
              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => editColor(color)} className="p-1.5 hover:bg-white/10 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteColor(color.id)} className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}