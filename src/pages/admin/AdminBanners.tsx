// ============================================
// HOTSHOT FABRICS - ADMIN BANNERS
// Production Ready | Hero Banner Management
// ============================================
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import {
  Plus, Edit, Trash2, X, Image, Upload, Eye, EyeOff,
  ArrowUp, ArrowDown, 
} from "lucide-react";

export function AdminBanners() {
  const { toast } = useApp();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    image_url: "",
    button_text: "Shop Now",
    button_link: "/shop",
    is_active: true,
    sort_order: "0",
    start_date: "",
    end_date: ""
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hero_banners")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      setBanners(data || []);
    } catch (err) {
      toast("Error loading banners", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `banners/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("banner-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("banner-images")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast("Image uploaded", "success");
    } catch (err) {
      toast("Error uploading image", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        image_url: formData.image_url,
        button_text: formData.button_text || "Shop Now",
        button_link: formData.button_link || "/shop",
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingBanner) {
        const { error } = await supabase.from("hero_banners").update(data).eq("id", editingBanner.id);
        if (error) throw error;
        toast("Banner updated", "success");
      } else {
        const { error } = await supabase.from("hero_banners").insert(data);
        if (error) throw error;
        toast("Banner created", "success");
      }

      setShowForm(false);
      setEditingBanner(null);
      resetForm();
      fetchBanners();
    } catch (err) {
      toast("Error saving banner", "error");
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      const { error } = await supabase.from("hero_banners").delete().eq("id", id);
      if (error) throw error;
      toast("Banner deleted", "success");
      fetchBanners();
    } catch (err) {
      toast("Error deleting banner", "error");
    }
  };

  const toggleActive = async (banner: any) => {
    try {
      const { error } = await supabase
        .from("hero_banners")
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);
      if (error) throw error;
      toast(banner.is_active ? "Banner hidden" : "Banner visible", "success");
      fetchBanners();
    } catch (err) {
      toast("Error updating banner", "error");
    }
  };

  const moveBanner = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= banners.length) return;

    const updated = [...banners];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // Update sort orders
    try {
      for (let i = 0; i < updated.length; i++) {
        await supabase.from("hero_banners").update({ sort_order: i }).eq("id", updated[i].id);
      }
      fetchBanners();
    } catch (err) {
      toast("Error reordering banners", "error");
    }
  };

  const editBanner = (banner: any) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image_url: banner.image_url,
      button_text: banner.button_text || "Shop Now",
      button_link: banner.button_link || "/shop",
      is_active: banner.is_active,
      sort_order: banner.sort_order?.toString() || "0",
      start_date: banner.start_date || "",
      end_date: banner.end_date || ""
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "", subtitle: "", image_url: "", button_text: "Shop Now",
      button_link: "/shop", is_active: true, sort_order: "0", start_date: "", end_date: ""
    });
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Hero Banners</h1>
          <p className="text-zinc-400 mt-1">Manage homepage carousel slides</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setShowForm(true); setEditingBanner(null); resetForm(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" /> Add Banner
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
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingBanner ? "Edit Banner" : "New Banner"}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-sm text-zinc-400 mb-1.5 block">Title *</label>
                    <input
                      type="text" required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="Summer Collection 2026"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-zinc-400 mb-1.5 block">Subtitle</label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={e => setFormData({...formData, subtitle: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="Discover the latest trends"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Button Text</label>
                    <input
                      type="text"
                      value={formData.button_text}
                      onChange={e => setFormData({...formData, button_text: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Button Link</label>
                    <input
                      type="text"
                      value={formData.button_link}
                      onChange={e => setFormData({...formData, button_link: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={e => setFormData({...formData, end_date: e.target.value})}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Banner Image *</label>
                  <div className="flex gap-4 items-start">
                    {formData.image_url && (
                      <div className="w-40 h-24 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={formData.image_url}
                        onChange={e => setFormData({...formData, image_url: e.target.value})}
                        className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors mb-2"
                        placeholder="Image URL"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        {uploading ? "Uploading..." : "Upload Image"}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </div>
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
                  <button type="submit" className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-colors">
                    {editingBanner ? "Update" : "Create"} Banner
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

      {/* Banners Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-zinc-900/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <Image className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No banners yet</h3>
          <p className="text-zinc-400 mb-4">Add banners to display on your homepage</p>
          <button onClick={() => setShowForm(true)} className="px-6 py-2.5 bg-orange-500 rounded-xl font-bold">
            Add First Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-zinc-900/80 border ${banner.is_active ? "border-zinc-800" : "border-zinc-800/50 opacity-60"} rounded-2xl overflow-hidden group`}
            >
              <div className="relative h-40">
                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="font-bold text-lg">{banner.title}</h3>
                  <p className="text-sm text-zinc-300">{banner.subtitle}</p>
                </div>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveBanner(index, "up")} disabled={index === 0} className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg backdrop-blur-sm disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveBanner(index, "down")} disabled={index === banners.length - 1} className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg backdrop-blur-sm disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${banner.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {banner.is_active ? "Active" : "Hidden"}
                    </span>
                    <span className="text-xs text-zinc-500">Order: {banner.sort_order}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(banner)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title={banner.is_active ? "Hide" : "Show"}>
                      {banner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => editBanner(banner)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteBanner(banner.id)} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}