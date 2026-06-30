// ============================================
// HOTSHOT FABRICS - ADMIN CATEGORIES
// Production Ready | Category Management
// ============================================
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import { ConfirmModal } from "../../components/ConfirmDialog";
import {
  Plus, Edit, Trash2, X, Save, Folder,
  Loader2
} from "lucide-react";

export function AdminCategories() {
  const { toast } = useApp();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "", slug: "", description: "", parent_id: "", sort_order: "0", is_active: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      toast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        description: formData.description || null,
        parent_id: formData.parent_id || null,
        sort_order: parseInt(formData.sort_order) || 0,
        is_active: formData.is_active
      };

      if (editingCategory) {
        const { error } = await supabase.from("categories").update(data).eq("id", editingCategory.id);
        if (error) throw error;
        toast("Category updated", "success");
      } else {
        const { error } = await supabase.from("categories").insert(data);
        if (error) throw error;
        toast("Category created", "success");
      }

      setShowForm(false);
      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (err: any) {
      toast(err.message || "Error saving category", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast("Category deleted", "success");
      fetchCategories();
    } catch (err: any) {
      toast(err.message || "Error deleting category", "error");
    }
  };

  const editCategory = (cat: any) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      parent_id: cat.parent_id || "",
      sort_order: cat.sort_order?.toString() || "0",
      is_active: cat.is_active
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "", parent_id: "", sort_order: "0", is_active: true });
  };

  const parentCategories = categories.filter(c => !c.parent_id);

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Categories</h1>
          <p className="text-zinc-400 mt-1">{categories.length} categories</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setShowForm(true); setEditingCategory(null); resetForm(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" /> Add Category
        </motion.button>
      </div>

      {/* Form */}
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
              <h2 className="font-bold">{editingCategory ? "Edit Category" : "New Category"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Name *</label>
                <input type="text" required value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Slug</label>
                <input type="text" value={formData.slug}
                  onChange={e => setFormData({...formData, slug: e.target.value})}
                  className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Description</label>
                <input type="text" value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Parent Category</label>
                <select value={formData.parent_id}
                  onChange={e => setFormData({...formData, parent_id: e.target.value})}
                  className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all">
                  <option value="">None (Top Level)</option>
                  {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Sort Order</label>
                <input type="number" value={formData.sort_order}
                  onChange={e => setFormData({...formData, sort_order: e.target.value})}
                  className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2 transition-all">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {editingCategory ? "Update" : "Create"}</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-zinc-700 hover:border-zinc-500 rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left p-4 text-sm font-semibold text-zinc-400">Name</th>
              <th className="text-left p-4 text-sm font-semibold text-zinc-400">Slug</th>
              <th className="text-left p-4 text-sm font-semibold text-zinc-400">Parent</th>
              <th className="text-left p-4 text-sm font-semibold text-zinc-400">Sort</th>
              <th className="text-right p-4 text-sm font-semibold text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td colSpan={5} className="p-4"><div className="h-10 bg-zinc-800/50 rounded-xl animate-pulse" /></td>
                </tr>
              ))
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-b border-zinc-800/50 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold text-sm">{cat.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-zinc-400">{cat.slug}</td>
                  <td className="p-4 text-sm text-zinc-400">{categories.find(c => c.id === cat.parent_id)?.name || "-"}</td>
                  <td className="p-4 text-sm">{cat.sort_order}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => editCategory(cat)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(cat.id)} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Delete Category"
        message="Are you sure? Products in this category may be affected."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => { if (deleteConfirm) deleteCategory(deleteConfirm); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}