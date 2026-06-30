import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";

export function QuickViewModal({ product, onClose }: { product: any, onClose: () => void }) {
  const { user, toast, setCurrentView } = useApp();
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      const { data } = await supabase
        .from("products")
        .select("*, colors:colors(*), sizes:sizes(*)")
        .eq("id", product.id)
        .single();
      if (data) setDetails(data);
      setLoading(false);
    };
    fetchDetails();
  }, [product.id]);

  const addToCart = async () => {
    if (!user) { toast("Please sign in to add to cart", "info"); setCurrentView("login"); return; }

    let query = supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", product.id);
    if (selectedColor) query = query.eq("color_id", selectedColor); else query = query.is("color_id", null);
    if (selectedSize) query = query.eq("size_id", selectedSize); else query = query.is("size_id", null);

    const { data: existingItem } = await query.maybeSingle();

    let error;
    if (existingItem) {
      const { error: updateError } = await supabase.from("cart_items").update({ quantity: existingItem.quantity + quantity }).eq("id", existingItem.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("cart_items").insert({
        user_id: user.id, product_id: product.id, color_id: selectedColor || null, size_id: selectedSize || null, quantity
      });
      error = insertError;
    }

    if (error) toast("Error adding to cart", "error");
    else { toast("Added to cart", "success"); onClose(); }
  };

  const primaryImage = product.images?.find((img: any) => img.is_primary)?.image_url || product.images?.[0]?.image_url;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        {/* Image */}
        <div className="w-full md:w-1/2 h-[300px] md:h-auto bg-zinc-950">
          <img src={primaryImage} alt={product.name} className="w-full h-full object-contain" />
        </div>
        
        {/* Details */}
        <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto">
          <h2 className="text-2xl font-black mb-2 pr-8">{product.name}</h2>
          <div className="flex gap-3 items-center mb-6">
            <span className="text-2xl font-bold text-orange-400">R{product.price}</span>
            {product.compare_price && <span className="text-zinc-500 line-through">R{product.compare_price}</span>}
          </div>
          
          <p className="text-zinc-400 text-sm mb-6 line-clamp-3">{product.short_description || product.description}</p>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-zinc-800 rounded" />
              <div className="h-10 bg-zinc-800 rounded" />
            </div>
          ) : (
            <div className="space-y-6">
              {details?.colors && details.colors.length > 0 && (
                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2 block">Color</label>
                  <div className="flex gap-2">
                    {details.colors.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedColor(c.id)}
                        className={`w-8 h-8 rounded-full border-2 ${selectedColor === c.id ? "border-white scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c.hex_code }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {details?.sizes && details.sizes.length > 0 && (
                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2 block">Size</label>
                  <div className="flex flex-wrap gap-2">
                    {details.sizes.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSize(s.id)}
                        className={`px-4 py-2 border rounded-lg text-sm font-bold transition-colors ${selectedSize === s.id ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-800 hover:border-zinc-600"}`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2 block">Quantity</label>
                <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-lg p-1 w-max">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded"><Minus className="w-4 h-4" /></button>
                  <span className="w-8 text-center font-bold">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              
              <button
                onClick={addToCart}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-black font-black text-lg rounded-xl flex items-center justify-center gap-2 transition-colors mt-6"
              >
                <ShoppingBag className="w-5 h-5" /> Add to Cart - R{(product.price * quantity).toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
