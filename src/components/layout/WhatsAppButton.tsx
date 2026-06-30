// ============================================
// HOTSHOT FABRICS - WHATSAPP BUTTON
// Production Ready
// ============================================
import { useApp } from "../../AppContext";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export function WhatsAppButton() {
  const { profile } = useApp();
  const phone = "0834160993";

  const handleClick = () => {
    const message = profile
      ? `Hi Hotshot Fabrics! I'm ${profile.full_name || profile.email}. I'd like to place an order.`
      : "Hi Hotshot Fabrics! I'd like to place an order.";
    window.open(`https://wa.me/27${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring" }}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-full shadow-2xl shadow-green-500/30 flex items-center justify-center transition-colors"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
    </motion.button>
  );
}