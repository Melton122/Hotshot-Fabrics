// ============================================
// HOTSHOT FABRICS - ADMIN HOME CONTENT
// Manage news, announcements & home page content
// ============================================
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import {
  Plus, Edit, Trash2, X, Megaphone, Eye, EyeOff,
  ArrowUp, ArrowDown, Save, Loader2, Bell
} from "lucide-react";

export function AdminHomeContent() {
  const { toast } = useApp();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    badge: "New",
    bg_color: "bg-orange-500/10",
    text_color: "text-orange-400",
    border_color: "border-orange-500/20",
    link_url: "",
    link_text: "Learn More",
    is_active: true,
    sort_order: "0"
  });

  const colorPresets = [
    { label: "Orange", bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
    { label: "Blue", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    { label: "Emerald", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    { label: "Purple", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    { label: "Red", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
    { label: "Yellow", bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  ];

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("home_announcements")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      toast("Error loading announcements", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        content: formData.content || null,
        badge: formData.badge || "New",
        bg_color: formData.bg_color,
        text_color: formData.text_color,
        border_color: formData.border_color,
        link_url: formData.link_url || null,
        link_text: formData.link_text || "Learn More",
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0
      };

      if (editingItem) {
        const { error } = await supabase
          .from("home_announcements")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast("Announcement updated", "success");
      } else {
        const { error } = await supabase
          .from("home_announcements")
          .insert(payload);
        if (error) throw error;
        toast("Announcement created", "success");
      }

      setShowForm(false);
      setEditingItem(null);
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      toast("Error saving announcement", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      const { error } = await supabase.from("home_announcements").delete().eq("id", id);
      if (error) throw error;
      toast("Deleted", "success");
      fetchAnnouncements();
    } catch (err) {
      toast("Error deleting", "error");
    }
  };

  const toggleActive = async (item: any) => {
    try {
      const { error } = await supabase
        .from("home_announcements")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);
      if (error) throw error;
      toast(item.is_active ? "Hidden" : "Visible", "success");
      fetchAnnouncements();
    } catch (err) {
      toast("Error updating", "error");
    }
  };

  const moveItem = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= announcements.length) return;

    const updated = [...announcements];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    try {
      for (let i = 0; i < updated.length; i++) {
        await supabase
          .from("home_announcements")
          .update({ sort_order: i })
          .eq("id", updated[i].id);
      }
      fetchAnnouncements();
    } catch (err) {
      toast("Error reordering", "error");
    }
  };

  const editItem = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content || "",
      badge: item.badge || "New",
      bg_color: item.bg_color || "bg-orange-500/10",
      text_color: item.text_color || "text-orange-400",
      border_color: item.border_color || "border-orange-500/20",
      link_url: item.link_url || "",
      link_text: item.link_text || "Learn More",
      is_active: item.is_active,
      sort_order: item.sort_order?.toString() || "0"
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "", content: "", badge: "New",
      bg_color: "bg-orange-500/10", text_color: "text-orange-400", border_color: "border-orange-500/20",
      link_url: "", link_text: "Learn More", is_active: true, sort_order: "0"
    });
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Home Content</h1>
          <p className="text-zinc-400 mt-1">Manage announcements, news & home page content</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setShowForm(true); setEditingItem(null); resetForm(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" /> Add Announcement
        </motion.button>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingItem ? "Edit" : "New"} Announcement</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Title *</label>
                  <input
                    type="text" required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="e.g. Summer Sale Now On!"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors min-h-[80px]"
                    placeholder="Short description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Badge</label>
                    <input
                      type="text"
                      value={formData.badge}
                      onChange={e => setFormData({...formData, badge: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="New, Sale, Hot"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={e => setFormData({...formData, sort_order: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Color Theme</label>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          bg_color: preset.bg,
                          text_color: preset.text,
                          border_color: preset.border
                        })}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                          formData.bg_color === preset.bg
                            ? `${preset.bg} ${preset.text} ${preset.border} border`
                            : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Link URL</label>
                    <input
                      type="text"
                      value={formData.link_url}
                      onChange={e => setFormData({...formData, link_url: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="/shop or https://..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Link Text</label>
                    <input
                      type="text"
                      value={formData.link_text}
                      onChange={e => setFormData({...formData, link_text: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="Shop Now"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="w-5 h-5 rounded border-zinc-700 bg-black text-orange-500 focus:ring-orange-500"
                  />
                  <label htmlFor="is_active" className="text-sm">Active (visible on homepage)</label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 rounded-xl font-bold transition-colors flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingItem ? "Update" : "Create"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-zinc-700 hover:border-zinc-500 rounded-xl transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-900/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <Megaphone className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No announcements</h3>
          <p className="text-zinc-400 mb-4">Add news, promotions, or updates for your homepage</p>
          <button onClick={() => { setShowForm(true); setEditingItem(null); resetForm(); }} className="px-6 py-2.5 bg-orange-500 rounded-xl font-bold">
            Add First Announcement
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-zinc-900/80 border ${item.is_active ? "border-zinc-800" : "border-zinc-800/50 opacity-60"} rounded-2xl p-5 group`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-lg font-bold ${item.bg_color} ${item.text_color} ${item.border_color} border`}>
                      {item.badge}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${item.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {item.is_active ? "Active" : "Hidden"}
                    </span>
                    <span className="text-xs text-zinc-500">Order: {item.sort_order}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                  {item.content && <p className="text-sm text-zinc-400 line-clamp-2">{item.content}</p>}
                  {item.link_url && (
                    <p className="text-xs text-orange-400 mt-1">Link: {item.link_url} → {item.link_text}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveItem(index, "up")} disabled={index === 0} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveItem(index, "down")} disabled={index === announcements.length - 1} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleActive(item)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title={item.is_active ? "Hide" : "Show"}>
                    {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => editItem(item)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteAnnouncement(item.id)} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
