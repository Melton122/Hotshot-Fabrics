// ============================================
// HOTSHOT FABRICS - ADMIN PRODUCTS
// Production Ready | Multi-Image Per Color | Front/Back Views
// ============================================
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import {
  Plus, Search, Edit, Trash2, X, Save, Upload, Package,
  AlertTriangle, CheckCircle, Loader2, Image, Eye, EyeOff,
  Star, Tag, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  Grid3X3, List, RefreshCw, Copy, Wand2, BarChart3, TrendingUp,
  Box, Palette, Ruler, Sparkles, Zap, Camera, Shirt, ArrowLeftRight
} from "lucide-react";
import { ConfirmModal } from "../../components/ConfirmDialog";

interface ProductImage {
  id?: string;
  image_url: string;
  is_primary: boolean;
  color_id?: string | null;
  view_type?: "front" | "back" | "side" | "detail" | null;
  sort_order?: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  compare_price: number | null;
  sku: string;
  category_id: string | null;
  stock_quantity: number;
  material: string;
  care_instructions: string;
  weight: number | null;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_bestseller: boolean;
  is_active: boolean;
  colors: string[];
  sizes: string[];
  tags: string[];
  images?: ProductImage[];
  category?: { name: string };
  view_count?: number;
  rating?: number;
  total_sales?: number;
  total_revenue?: number;
  created_at?: string;
}

interface ColorOption {
  id: string;
  name: string;
  hex_code: string;
  sort_order?: number;
}

interface SizeOption {
  id: string;
  name: string;
  sort_order?: number;
}

// ─── SKU GENERATOR ───
function generateSKU(name: string, categoryName: string = "", existingSKUs: string[] = []): string {
  const prefix = categoryName ? categoryName.substring(0, 3).toUpperCase() : "HF";
  const namePart = name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .substring(0, 4);
  const random = Math.floor(Math.random() * 9000) + 1000;
  let sku = `${prefix}-${namePart}-${random}`;

  let counter = 1;
  const baseSku = sku;
  while (existingSKUs.includes(sku)) {
    sku = `${baseSku}-${counter}`;
    counter++;
  }
  return sku;
}

// ─── VIEW TYPE OPTIONS ───
const VIEW_TYPES = [
  { value: "front", label: "Front", icon: Shirt },
  { value: "back", label: "Back", icon: ArrowLeftRight },
  { value: "side", label: "Side", icon: Camera },
  { value: "detail", label: "Detail", icon: Eye },
] as const;

type ViewType = typeof VIEW_TYPES[number]["value"];

export function AdminProducts() {
  const { toast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [colors, setColors] = useState<ColorOption[]>([]);
  const [sizes, setSizes] = useState<SizeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "low-stock" | "featured" | "bestseller" | "new">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"created" | "price" | "stock" | "sales" | "name">("created");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, lowStock: 0, revenue: 0 });
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [selectedColorForImages, setSelectedColorForImages] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const realtimeRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    name: "", slug: "", description: "", short_description: "", price: "", compare_price: "",
    sku: "", category_id: "", stock_quantity: "", material: "", care_instructions: "", weight: "",
    is_featured: false, is_new_arrival: false, is_bestseller: false, is_active: true,
    colors: [] as string[], sizes: [] as string[], tags: ""
  });
  
  // Enhanced image state with color association and view type
  const [productImages, setProductImages] = useState<{
    file?: File;
    preview: string;
    id?: string;
    image_url?: string;
    color_id?: string | null;
    view_type?: ViewType | null;
    is_primary?: boolean;
  }[]>([]);
  
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  // ─── FETCH PRODUCTS ───
  const fetchProducts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let query = supabase
        .from("products")
        .select(`
          *,
          images:product_images(id, image_url, is_primary, color_id, view_type, sort_order),
          category:categories(name),
          total_sales,
          total_revenue,
          view_count,
          rating
        `)
        .order(sortBy === "created" ? "created_at" : sortBy === "price" ? "price" : sortBy === "sales" ? "total_sales" : sortBy === "name" ? "name" : "stock_quantity", 
          { ascending: sortBy === "name" ? true : sortBy === "created" ? false : sortBy === "price" ? false : sortBy === "sales" ? false : true });

      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
      if (filterStatus === "active") query = query.eq("is_active", true);
      if (filterStatus === "inactive") query = query.eq("is_active", false);
      if (filterStatus === "low-stock") query = query.lte("stock_quantity", 5).eq("is_active", true);
      if (filterStatus === "featured") query = query.eq("is_featured", true);
      if (filterStatus === "bestseller") query = query.eq("is_bestseller", true);
      if (filterStatus === "new") query = query.eq("is_new_arrival", true);

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);

      // Calculate stats
      const all = data || [];
      setStats({
        total: all.length,
        active: all.filter(p => p.is_active).length,
        lowStock: all.filter(p => p.stock_quantity <= 5 && p.is_active).length,
        revenue: all.reduce((sum, p) => sum + (p.total_revenue || 0), 0)
      });
    } catch (err) {
      toast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, sortBy, toast]);

  const fetchFilters = async () => {
    try {
      const [{ data: cats }, { data: cols }, { data: sizs }] = await Promise.all([
        supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("colors").select("*").order("sort_order"),
        supabase.from("sizes").select("*").order("sort_order")
      ]);
      if (cats) setCategories(cats);
      if (cols) setColors(cols);
      if (sizs) setSizes(sizs);
    } catch (err) {
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchFilters();
  }, [fetchProducts]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-products-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
        fetchProducts(false);
        if (payload.eventType === "INSERT") {
          toast(`New product: ${payload.new.name}`, "success");
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "product_images" }, () => {
        fetchProducts(false);
      })
      .subscribe();

    realtimeRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [fetchProducts, toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProducts();
    setIsRefreshing(false);
    toast("Products refreshed", "success");
  };

  // ─── AUTO-GENERATE SKU ───
  const autoGenerateSKU = () => {
    if (!formData.name) {
      toast("Enter product name first", "error");
      return;
    }
    const categoryName = categories.find(c => c.id === formData.category_id)?.name || "";
    const existingSKUs = products.map(p => p.sku).filter(Boolean);
    const newSku = generateSKU(formData.name, categoryName, existingSKUs);
    setFormData(prev => ({ ...prev, sku: newSku }));
    toast("SKU generated", "success");
  };

  // ─── AUTO-GENERATE SLUG ───
  const autoGenerateSlug = () => {
    if (!formData.name) return;
    const slug = formData.name.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Auto-generate slug if empty
      let slug = formData.slug;
      if (!slug && formData.name) {
        slug = formData.name.toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
      }

      // Auto-generate SKU if empty
      let sku = formData.sku;
      if (!sku && formData.name) {
        const categoryName = categories.find(c => c.id === formData.category_id)?.name || "";
        const existingSKUs = products.map(p => p.sku).filter(Boolean);
        sku = generateSKU(formData.name, categoryName, existingSKUs);
      }

      const productData = {
        name: formData.name,
        slug,
        description: formData.description || null,
        short_description: formData.short_description || null,
        price: parseFloat(formData.price) || 0,
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        sku: sku || null,
        category_id: formData.category_id || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        material: formData.material || null,
        care_instructions: formData.care_instructions || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        is_featured: formData.is_featured,
        is_new_arrival: formData.is_new_arrival,
        is_bestseller: formData.is_bestseller,
        is_active: formData.is_active,
        colors: formData.colors,
        sizes: formData.sizes,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : []
      };

      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", productId);
        if (error) throw error;
        toast("Product updated successfully", "success");
      } else {
        const { data, error } = await supabase.from("products").insert(productData).select().single();
        if (error) throw error;
        productId = data.id;
        toast("Product created successfully", "success");
      }

      // Handle deleted images
      if (productId && deletedImageIds.length > 0) {
        await supabase.from("product_images").delete().in("id", deletedImageIds);
      }

      // Upload new images with color and view type
      if (productId) {
        const newImages = productImages.filter(img => img.file);
        for (let i = 0; i < newImages.length; i++) {
          const img = newImages[i];
          if (img.file) await uploadImage(productId, img.file, img.color_id, img.view_type, i);
        }
      }

      setShowForm(false);
      setEditingProduct(null);
      resetForm();
      await fetchProducts();
    } catch (err: any) {
      toast(err.message || "Error saving product", "error");
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (
    productId: string, 
    file: File, 
    colorId?: string | null, 
    viewType?: ViewType | null,
    sortOrder?: number
  ) => {
    const fileExt = file.name.split(".").pop();
    const filePath = `products/${productId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) throw new Error("Failed to get public URL");

    await supabase.from("product_images").insert({
      product_id: productId,
      image_url: publicUrl,
      is_primary: sortOrder === 0 && !colorId,
      color_id: colorId || null,
      view_type: viewType || null,
      sort_order: sortOrder || 0
    });
  };

  const handleImageRemove = (index: number) => {
    setProductImages(prev => {
      const img = prev[index];
      if (img?.id) setDeletedImageIds(current => [...current, img.id!]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ─── FIXED: Toggle color/size selection ───
  const toggleColor = (colorId: string) => {
    setFormData(prev => {
      const newColors = prev.colors.includes(colorId)
        ? prev.colors.filter(id => id !== colorId)
        : [...prev.colors, colorId];
      return { ...prev, colors: newColors };
    });
  };

  const toggleSize = (sizeId: string) => {
    setFormData(prev => {
      const newSizes = prev.sizes.includes(sizeId)
        ? prev.sizes.filter(id => id !== sizeId)
        : [...prev.sizes, sizeId];
      return { ...prev, sizes: newSizes };
    });
  };

  // ─── IMAGE COLOR ASSIGNMENT ───
  const assignImageColor = (imageIndex: number, colorId: string | null) => {
    setProductImages(prev => prev.map((img, i) => 
      i === imageIndex ? { ...img, color_id: colorId } : img
    ));
  };

  const assignImageViewType = (imageIndex: number, viewType: ViewType | null) => {
    setProductImages(prev => prev.map((img, i) => 
      i === imageIndex ? { ...img, view_type: viewType } : img
    ));
  };

  const setImageAsPrimary = (imageIndex: number) => {
    setProductImages(prev => prev.map((img, i) => ({
      ...img,
      is_primary: i === imageIndex
    })));
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast("Product deleted", "success");
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      toast(err.message || "Error deleting product", "error");
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const { error } = await supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id);
      if (error) throw error;
      toast(`Product ${product.is_active ? "deactivated" : "activated"}`, "success");
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p));
    } catch (err: any) {
      toast(err.message || "Error updating product", "error");
    }
  };

  const duplicateProduct = async (product: Product) => {
    try {
      const { id, created_at, updated_at, images, category, total_sales, total_revenue, view_count, rating, ...productData } = product as any;
      const newName = `${product.name} (Copy)`;
      const categoryName = categories.find(c => c.id === product.category_id)?.name || "";
      const existingSKUs = products.map(p => p.sku).filter(Boolean);
      const newSku = generateSKU(newName, categoryName, existingSKUs);

      const { data, error } = await supabase.from("products").insert({
        ...productData,
        name: newName,
        slug: `${product.slug}-copy`,
        sku: newSku,
        is_active: false,
        view_count: 0,
        total_sales: 0,
        total_revenue: 0,
        rating: 0
      }).select().single();

      if (error) throw error;
      toast("Product duplicated", "success");
      fetchProducts(false);
    } catch (err: any) {
      toast(err.message || "Error duplicating product", "error");
    }
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      short_description: product.short_description || "",
      price: product.price?.toString() || "",
      compare_price: product.compare_price?.toString() || "",
      sku: product.sku || "",
      category_id: product.category_id || "",
      stock_quantity: product.stock_quantity?.toString() || "",
      material: product.material || "",
      care_instructions: product.care_instructions || "",
      weight: product.weight?.toString() || "",
      is_featured: product.is_featured,
      is_new_arrival: product.is_new_arrival,
      is_bestseller: product.is_bestseller,
      is_active: product.is_active,
      colors: product.colors || [],
      sizes: product.sizes || [],
      tags: product.tags?.join(", ") || ""
    });
    setProductImages(product.images?.map(img => ({
      ...img,
      preview: img.image_url,
      color_id: img.color_id,
      view_type: img.view_type as ViewType,
      is_primary: img.is_primary
    })) || []);
    setDeletedImageIds([]);
    setSelectedColorForImages(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "", slug: "", description: "", short_description: "", price: "", compare_price: "",
      sku: "", category_id: "", stock_quantity: "", material: "", care_instructions: "", weight: "",
      is_featured: false, is_new_arrival: false, is_bestseller: false, is_active: true,
      colors: [], sizes: [], tags: ""
    });
    setProductImages([]);
    setDeletedImageIds([]);
    setSelectedColorForImages(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProductImages(prev => [...prev, { 
          file, 
          preview: ev.target?.result as string,
          color_id: selectedColorForImages,
          view_type: null,
          is_primary: prev.length === 0
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const copySKU = (sku: string) => {
    navigator.clipboard.writeText(sku);
    toast("SKU copied", "success");
  };

  // ─── GET IMAGES FOR A SPECIFIC COLOR ───
  const getImagesForColor = (colorId: string | null) => {
    if (colorId === null) {
      return productImages.filter(img => !img.color_id);
    }
    return productImages.filter(img => img.color_id === colorId);
  };

  // ─── GET COLOR NAME BY ID ───
  const getColorName = (colorId: string | null | undefined) => {
    if (!colorId) return "No Color";
    return colors.find(c => c.id === colorId)?.name || "Unknown";
  };

  // ─── GET COLOR HEX BY ID ───
  const getColorHex = (colorId: string | null | undefined) => {
    if (!colorId) return "#333";
    return colors.find(c => c.id === colorId)?.hex_code || "#333";
  };

  // Pagination
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen pb-20">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Products", value: stats.total, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Active", value: stats.active, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
          { label: "Revenue", value: `R${stats.revenue.toFixed(2)}`, icon: BarChart3, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} ${stat.border} border rounded-xl p-4`}>
            <div className="flex items-center justify-between">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black">Products</h1>
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-zinc-400 mt-1">{products.length} products in inventory</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-zinc-400 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-orange-500 text-black" : "text-zinc-400 hover:text-white"}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-orange-500 text-black" : "text-zinc-400 hover:text-white"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && fetchProducts()}
              className="pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 w-64 transition-colors"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="low-stock">Low Stock</option>
            <option value="featured">Featured</option>
            <option value="bestseller">Best Sellers</option>
            <option value="new">New Arrivals</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="created">Newest</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
            <option value="sales">Sales</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowForm(true); setEditingProduct(null); resetForm(); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-shadow"
          >
            <Plus className="w-4 h-4" /> Add Product
          </motion.button>
        </div>
      </div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto my-8"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
                <h2 className="text-xl font-bold">{editingProduct ? "Edit Product" : "Add New Product"}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Product Name *</label>
                    <input type="text" required value={formData.name}
                      onChange={e => { setFormData(prev => ({...prev, name: e.target.value})); if (!formData.slug) autoGenerateSlug(); }}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      placeholder="e.g., Premium Cotton T-Shirt" />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Slug</label>
                    <div className="flex gap-2">
                      <input type="text" value={formData.slug}
                        onChange={e => setFormData(prev => ({...prev, slug: e.target.value}))}
                        className="flex-1 px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                        placeholder="auto-generated" />
                      <button type="button" onClick={autoGenerateSlug} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors" title="Auto-generate">
                        <Wand2 className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">SKU</label>
                    <div className="flex gap-2">
                      <input type="text" value={formData.sku}
                        onChange={e => setFormData(prev => ({...prev, sku: e.target.value}))}
                        className="flex-1 px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all font-mono text-sm"
                        placeholder="e.g., HF-TS-001" />
                      <button type="button" onClick={autoGenerateSKU} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors" title="Auto-generate SKU">
                        <Wand2 className="w-4 h-4 text-orange-400" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Leave empty to auto-generate</p>
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Price (R) *</label>
                    <input type="number" required step="0.01" min="0" value={formData.price}
                      onChange={e => setFormData(prev => ({...prev, price: e.target.value}))}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="299.99" />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Compare Price (R)</label>
                    <input type="number" step="0.01" min="0" value={formData.compare_price}
                      onChange={e => setFormData(prev => ({...prev, compare_price: e.target.value}))}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="Original price" />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Category</label>
                    <select value={formData.category_id}
                      onChange={e => setFormData(prev => ({...prev, category_id: e.target.value}))}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all">
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Stock Quantity</label>
                    <input type="number" min="0" value={formData.stock_quantity}
                      onChange={e => setFormData(prev => ({...prev, stock_quantity: e.target.value}))}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all" />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Weight (kg)</label>
                    <input type="number" step="0.01" min="0" value={formData.weight}
                      onChange={e => setFormData(prev => ({...prev, weight: e.target.value}))}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="0.5" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Short Description</label>
                    <input type="text" value={formData.short_description}
                      onChange={e => setFormData(prev => ({...prev, short_description: e.target.value}))}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="Brief product description for listings" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Description</label>
                    <textarea rows={4} value={formData.description}
                      onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 resize-none transition-all"
                      placeholder="Detailed product description..." />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Material</label>
                    <input type="text" value={formData.material}
                      onChange={e => setFormData(prev => ({...prev, material: e.target.value}))}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="e.g., 100% Cotton" />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Tags (comma separated)</label>
                    <input type="text" value={formData.tags}
                      onChange={e => setFormData(prev => ({...prev, tags: e.target.value}))}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="summer, casual, premium" />
                  </div>

                  {/* ─── COLORS ─── */}
                  <div className="sm:col-span-2">
                    <label className="text-sm text-zinc-400 mb-2 block font-medium flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Available Colors
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {colors.map(c => {
                        const isSelected = formData.colors.includes(c.id);
                        return (
                          <button 
                            key={c.id} 
                            type="button"
                            onClick={() => toggleColor(c.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                              isSelected 
                                ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10" 
                                : "border-zinc-800 hover:border-zinc-600"
                            }`}
                          >
                            <div 
                              className={`w-5 h-5 rounded-full border-2 transition-all ${
                                isSelected ? "border-orange-500 scale-110" : "border-zinc-700"
                              }`} 
                              style={{ backgroundColor: c.hex_code }} 
                            />
                            <span className={`text-sm ${isSelected ? "text-orange-400 font-medium" : "text-zinc-400"}`}>
                              {c.name}
                            </span>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-orange-500" />}
                          </button>
                        );
                      })}
                    </div>
                    {formData.colors.length === 0 && (
                      <p className="text-xs text-zinc-600 mt-2">No colors selected. Product will show as single color.</p>
                    )}
                  </div>

                  {/* ─── SIZES ─── */}
                  <div className="sm:col-span-2">
                    <label className="text-sm text-zinc-400 mb-2 block font-medium flex items-center gap-2">
                      <Ruler className="w-4 h-4" /> Available Sizes
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(s => {
                        const isSelected = formData.sizes.includes(s.id);
                        return (
                          <button 
                            key={s.id} 
                            type="button"
                            onClick={() => toggleSize(s.id)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                              isSelected 
                                ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-lg" 
                                : "border-zinc-800 hover:border-zinc-600 text-zinc-400"
                            }`}
                          >
                            {s.name}
                            {isSelected && <CheckCircle className="w-3 h-3 inline ml-1.5 text-orange-500" />}
                          </button>
                        );
                      })}
                    </div>
                    {formData.sizes.length === 0 && (
                      <p className="text-xs text-zinc-600 mt-2">No sizes selected. Product will be one-size-fits-all.</p>
                    )}
                  </div>

                  {/* Flags */}
                  <div className="sm:col-span-2 flex flex-wrap gap-4">
                    {[
                      { key: "is_featured" as const, label: "Featured", icon: Star },
                      { key: "is_new_arrival" as const, label: "New Arrival", icon: Sparkles },
                      { key: "is_bestseller" as const, label: "Best Seller", icon: TrendingUp },
                      { key: "is_active" as const, label: "Active", icon: Zap },
                    ].map((flag) => (
                      <label key={flag.key} className="flex items-center gap-2 cursor-pointer group">
                        <div 
                          onClick={() => setFormData(prev => ({ ...prev, [flag.key]: !prev[flag.key] }))}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                            formData[flag.key] ? "border-orange-500 bg-orange-500" : "border-zinc-700 group-hover:border-zinc-500"
                          }`}
                        >
                          {formData[flag.key] && <CheckCircle className="w-3.5 h-3.5 text-black" />}
                        </div>
                        <flag.icon className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-sm">{flag.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* ─── ENHANCED IMAGES SECTION ─── */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm text-zinc-400 font-medium flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Product Images
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Upload for:</span>
                        <select
                          value={selectedColorForImages || ""}
                          onChange={(e) => setSelectedColorForImages(e.target.value || null)}
                          className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                        >
                          <option value="">General (No Color)</option>
                          {formData.colors.map(colorId => {
                            const color = colors.find(c => c.id === colorId);
                            return color ? (
                              <option key={color.id} value={color.id}>{color.name}</option>
                            ) : null;
                          })}
                        </select>
                        {selectedColorForImages && (
                          <div 
                            className="w-4 h-4 rounded-full border border-zinc-600" 
                            style={{ backgroundColor: getColorHex(selectedColorForImages) }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Upload Area */}
                    <div className="flex gap-3 flex-wrap mb-4">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-28 h-28 rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center hover:border-orange-500 hover:bg-orange-500/5 transition-all"
                      >
                        <Upload className="w-6 h-6 text-zinc-500 mb-1" />
                        <span className="text-[10px] text-zinc-500">Add Image</span>
                        {selectedColorForImages && (
                          <span className="text-[9px] text-orange-400 mt-0.5">
                            {getColorName(selectedColorForImages)}
                          </span>
                        )}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple
                        onChange={handleImageUpload} className="hidden" />
                    </div>

                    {/* Images by Color Groups */}
                    <div className="space-y-4">
                      {/* General Images (no color) */}
                      {getImagesForColor(null).length > 0 && (
                        <div className="bg-zinc-800/30 rounded-xl p-4">
                          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Package className="w-3 h-3" /> General Images
                          </h4>
                          <div className="flex gap-3 flex-wrap">
                            {getImagesForColor(null).map((img, idx) => {
                              const originalIndex = productImages.findIndex(i => i === img);
                              return (
                                <ImageCard 
                                  key={originalIndex}
                                  img={img}
                                  index={originalIndex}
                                  colors={colors}
                                  onRemove={() => handleImageRemove(originalIndex)}
                                  onAssignColor={(colorId) => assignImageColor(originalIndex, colorId)}
                                  onAssignViewType={(viewType) => assignImageViewType(originalIndex, viewType)}
                                  onSetPrimary={() => setImageAsPrimary(originalIndex)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Images per selected color */}
                      {formData.colors.map(colorId => {
                        const colorImages = getImagesForColor(colorId);
                        if (colorImages.length === 0) return null;
                        const color = colors.find(c => c.id === colorId);
                        if (!color) return null;

                        return (
                          <div key={colorId} className="bg-zinc-800/30 rounded-xl p-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full border border-zinc-600" 
                                style={{ backgroundColor: color.hex_code }}
                              />
                              <span style={{ color: color.hex_code }}>{color.name}</span>
                              <span className="text-zinc-500">— {colorImages.length} image{colorImages.length !== 1 ? "s" : ""}</span>
                            </h4>
                            <div className="flex gap-3 flex-wrap">
                              {colorImages.map((img, idx) => {
                                const originalIndex = productImages.findIndex(i => i === img);
                                return (
                                  <ImageCard 
                                    key={originalIndex}
                                    img={img}
                                    index={originalIndex}
                                    colors={colors}
                                    onRemove={() => handleImageRemove(originalIndex)}
                                    onAssignColor={(cid) => assignImageColor(originalIndex, cid)}
                                    onAssignViewType={(viewType) => assignImageViewType(originalIndex, viewType)}
                                    onSetPrimary={() => setImageAsPrimary(originalIndex)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {productImages.length === 0 && (
                      <p className="text-sm text-zinc-600 text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl">
                        No images yet. Click "Add Image" to upload.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                  <button type="submit" disabled={uploading}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {editingProduct ? "Update" : "Create"} Product</>}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-6 py-3 border border-zinc-700 hover:border-zinc-500 rounded-xl transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {showImagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowImagePreview(null)}
          >
            <img src={showImagePreview} alt="Preview" className="max-w-full max-h-full rounded-xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products View */}
      {viewMode === "list" ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400">Product</th>
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400">SKU</th>
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400">Category</th>
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400">Price</th>
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400">Stock</th>
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400">Sales</th>
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400">Status</th>
                  <th className="text-right p-4 text-sm font-semibold text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-800/50">
                      <td colSpan={8} className="p-4">
                        <div className="flex items-center gap-3 animate-pulse">
                          <div className="w-12 h-12 bg-zinc-800 rounded-xl" />
                          <div className="space-y-2">
                            <div className="h-4 bg-zinc-800 rounded w-32" />
                            <div className="h-3 bg-zinc-800 rounded w-20" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500">No products found</p>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
                    <tr key={product.id} className="border-b border-zinc-800/50 hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-800 cursor-pointer"
                            onClick={() => product.images?.[0]?.image_url && setShowImagePreview(product.images[0].image_url)}>
                            <img src={product.images?.[0]?.image_url || "https://via.placeholder.com/48"} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{product.name}</p>
                            <div className="flex gap-1 mt-1">
                              {product.is_featured && <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded">Featured</span>}
                              {product.is_new_arrival && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">New</span>}
                              {product.is_bestseller && <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">Best</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {product.sku ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded">{product.sku}</code>
                            <button onClick={() => copySKU(product.sku)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded">
                              <Copy className="w-3 h-3 text-zinc-500" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600">No SKU</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-zinc-400">{product.category?.name || "-"}</td>
                      <td className="p-4 text-sm">
                        <span className="font-bold text-orange-400">R{product.price}</span>
                        {product.compare_price && <span className="text-xs text-zinc-500 line-through ml-2">R{product.compare_price}</span>}
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`font-medium ${product.stock_quantity <= 5 ? "text-red-400" : "text-zinc-400"}`}>
                          {product.stock_quantity}
                        </span>
                        {product.stock_quantity <= 5 && <AlertTriangle className="w-3 h-3 text-red-400 inline ml-1" />}
                      </td>
                      <td className="p-4 text-sm">
                        <span className="text-zinc-400">{product.total_sales || 0}</span>
                        {product.rating && <span className="text-xs text-orange-400 ml-1">★{product.rating}</span>}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => toggleProductStatus(product)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-all ${
                            product.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                          }`}
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => editProduct(product)} className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => duplicateProduct(product)} className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Duplicate">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(product.id)} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors" title="Delete">
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
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 animate-pulse h-64" />
            ))
          ) : paginatedProducts.length === 0 ? (
            <div className="col-span-full p-12 text-center">
              <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No products found</p>
            </div>
          ) : (
            paginatedProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-all"
              >
                <div className="relative aspect-square bg-zinc-800 cursor-pointer"
                  onClick={() => product.images?.[0]?.image_url && setShowImagePreview(product.images[0].image_url)}>
                  <img src={product.images?.[0]?.image_url || "https://via.placeholder.com/300"} alt={product.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 flex gap-1">
                    {product.is_featured && <span className="text-[10px] px-2 py-1 bg-orange-500 text-black font-bold rounded-lg">Featured</span>}
                    {product.is_new_arrival && <span className="text-[10px] px-2 py-1 bg-blue-500 text-white font-bold rounded-lg">New</span>}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); editProduct(product); }} className="p-2 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateProduct(product); }} className="p-2 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-sm truncate">{product.name}</p>
                  {product.sku && <p className="text-[10px] text-zinc-600 font-mono">{product.sku}</p>}
                  <p className="text-xs text-zinc-500">{product.category?.name || "-"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-orange-400">R{product.price}</span>
                    <span className={`text-xs px-2 py-1 rounded-lg ${product.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}>
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                    <span>Stock: {product.stock_quantity}</span>
                    <span>Sold: {product.total_sales || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 disabled:opacity-50 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-zinc-400 px-4">
            Page {currentPage} of {totalPages} ({products.length} items)
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 disabled:opacity-50 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => { if (deleteConfirm) deleteProduct(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

// ─── IMAGE CARD COMPONENT ───
function ImageCard({ 
  img, 
  index, 
  colors, 
  onRemove, 
  onAssignColor, 
  onAssignViewType,
  onSetPrimary
}: { 
  img: any; 
  index: number; 
  colors: ColorOption[];
  onRemove: () => void;
  onAssignColor: (colorId: string | null) => void;
  onAssignViewType: (viewType: ViewType | null) => void;
  onSetPrimary: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative group">
      <div 
        className={`w-28 h-28 rounded-xl overflow-hidden bg-zinc-800 border-2 transition-all cursor-pointer ${
          img.is_primary ? "border-orange-500 shadow-lg shadow-orange-500/20" : "border-zinc-800 hover:border-zinc-600"
        }`}
        onClick={() => setShowMenu(!showMenu)}
      >
        <img src={img.preview} alt="" className="w-full h-full object-cover" />
        
        {/* Primary badge */}
        {img.is_primary && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-orange-500 text-black text-[9px] font-bold rounded">
            PRIMARY
          </div>
        )}
        
        {/* View type badge */}
        {img.view_type && (
          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-medium rounded capitalize">
            {img.view_type}
          </div>
        )}
        
        {/* Color indicator */}
        {img.color_id && (
          <div 
            className="absolute bottom-1 left-1 w-3 h-3 rounded-full border border-white/50"
            style={{ backgroundColor: colors.find(c => c.id === img.color_id)?.hex_code || "#333" }}
          />
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSetPrimary(); }}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
            img.is_primary ? "bg-orange-500 text-black" : "bg-zinc-700 text-zinc-400 hover:bg-orange-500 hover:text-black"
          }`}
          title="Set as primary"
        >
          <Star className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500"
          title="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Dropdown menu for color/view assignment */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-xl p-3 z-20 shadow-xl"
          >
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">View Type</p>
            <div className="flex gap-1 mb-3">
              {VIEW_TYPES.map(vt => (
                <button
                  key={vt.value}
                  type="button"
                  onClick={() => { onAssignViewType(vt.value); setShowMenu(false); }}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    img.view_type === vt.value 
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" 
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {vt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { onAssignViewType(null); setShowMenu(false); }}
                className="px-2 py-1.5 rounded-lg text-[10px] font-medium bg-zinc-900 text-zinc-500 hover:bg-zinc-700"
              >
                Clear
              </button>
            </div>

            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Assign to Color</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              <button
                type="button"
                onClick={() => { onAssignColor(null); setShowMenu(false); }}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                  !img.color_id ? "bg-orange-500/20 text-orange-400" : "text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                General (No Color)
              </button>
              {colors.map(color => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => { onAssignColor(color.id); setShowMenu(false); }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all ${
                    img.color_id === color.id ? "bg-orange-500/20 text-orange-400" : "text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  <div className="w-3 h-3 rounded-full border border-zinc-600" style={{ backgroundColor: color.hex_code }} />
                  {color.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}