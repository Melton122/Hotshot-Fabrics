import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import { useStoreSettings } from "../hooks/useStoreSettings";
import {
  ChevronLeft, Package, Truck, CheckCircle, Clock, MapPin,
  Phone, Mail, MessageCircle, Copy, Check, XCircle, Send,
  RefreshCw, ExternalLink, Printer, Download,
  AlertTriangle, ShieldCheck, Star, Calendar, Hash,
  FileText, User, Bot, Receipt, ShoppingBag, Tag, CreditCard,
  Sparkles, Ban, ImageIcon, Loader2, Navigation, Banknote,
  Building2, ChevronDown, Trash2
} from "lucide-react";

const STATUS_STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "preparing", label: "Preparing", icon: Package },
  { key: "ready_for_delivery", label: "Ready", icon: ShoppingBag },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "Pending", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  confirmed: { label: "Confirmed", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  preparing: { label: "Preparing", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  ready_for_delivery: { label: "Ready", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  out_for_delivery: { label: "Out for Delivery", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  delivered: { label: "Delivered", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  cancelled: { label: "Cancelled", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  returned: { label: "Returned", color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" },
};

const PAYMENT_ICONS: Record<string, any> = {
  cash_on_delivery: Banknote,
  eft_bank_transfer: Building2,
};

interface ChatMessage {
  id: string;
  order_id: string;
  sender_type: "admin" | "customer";
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const formatCurrency = (n: number) => `R${(n || 0).toFixed(2)}`;

const timeAgo = (date: string) => {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { setCurrentView, toast, user } = useApp();
  const { settings: storeSettings } = useStoreSettings();
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [showItemsAll, setShowItemsAll] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<any>(null);
  const typingChannelRef = useRef<any>(null);
  const chatChannelRef = useRef<any>(null);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const { data: orderData, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (error) throw error;
      const { data: itemsData } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      const { data: trackingData } = await supabase.from("order_tracking").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
      const { data: chatData } = await supabase.from("order_chats").select("*").eq("order_id", orderId).order("created_at", { ascending: true });
      setOrder({ ...orderData, items: itemsData || [] });
      setTracking(trackingData || []);
      setChatMessages((chatData || []) as ChatMessage[]);
    } catch (err) {
      toast("Failed to load order", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  // Real-time chat subscription
  useEffect(() => {
    if (!orderId) return;

    // Subscribe to new chat messages (including deletes)
    const chatChannel = supabase
      .channel(`order_chats_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_chats",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as ChatMessage;
            setChatMessages((prev) => {
              // Avoid duplicates
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // Mark as read if it's from admin
            if (newMsg.sender_type === "admin") {
              supabase.from("order_chats").update({ is_read: true }).eq("id", newMsg.id).then();
            }
          } else if (payload.eventType === "DELETE") {
            const oldId = payload.old.id;
            setChatMessages((prev) => prev.filter((m) => m.id !== oldId));
          }
        }
      )
      .subscribe((status) => {
      });

    chatChannelRef.current = chatChannel;

    // Typing indicator channel
    const typingChannel = supabase
      .channel(`typing_${orderId}`)
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload?.sender === "admin") {
          setAdminTyping(true);
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setAdminTyping(false), 3000);
        }
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
      clearTimeout(typingTimerRef.current);
    };
  }, [orderId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, adminTyping]);

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !user) {
      toast("Cannot send empty message", "error");
      return;
    }
    
    setSendingChat(true);
    
    // Send typing stopped event
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { sender: "customer", typing: false },
      });
    }
    
    try {
      const messageText = newMessage.trim();
      const senderName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer";
      
      
      const { data, error } = await supabase
        .from("order_chats")
        .insert({
          order_id: orderId,
          sender_type: "customer",
          sender_name: senderName,
          message: messageText,
          is_read: false,
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      
      // Add message to state immediately
      setChatMessages((prev) => [...prev, data]);
      setNewMessage("");
      toast("Message sent!", "success");
      
    } catch (err: any) {
      toast(err.message || "Failed to send message", "error");
    } finally {
      setSendingChat(false);
    }
  };

  const deleteChatMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from("order_chats")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setChatMessages((prev) => prev.filter((m) => m.id !== id));
      toast("Message deleted", "success");
    } catch (err: any) {
      toast(err.message || "Failed to delete message", "error");
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { sender: "customer", typing: value.length > 0 },
      });
    }
  };

  const cancelOrder = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString()
        })
        .eq("id", orderId);
      
      if (error) throw error;
      
      await supabase.from("order_tracking").insert({
        order_id: orderId,
        status: "cancelled",
        description: "Order cancelled by customer.",
        is_customer_visible: true
      });
      
      setOrder((prev: any) => ({ ...prev, status: "cancelled" }));
      setShowCancelConfirm(false);
      toast("Order cancelled", "info");
    } catch (err) {
      toast("Failed to cancel order", "error");
    } finally {
      setCancelling(false);
    }
  };

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order?.order_number || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast("Copied!", "success");
  };

  const contactWhatsApp = (msg?: string) => {
    const phone = order?.shipping_address?.phone?.replace(/^0/, "27");
    if (!phone) {
      toast("No phone number on file", "error");
      return;
    }
    const text = msg || `Hi! Following up on order ${order?.order_number}. Can you please provide an update?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const getTrackingUrl = () => {
    if (!order?.tracking_number) return null;
    const url = order?.tracking_url;
    if (url) return url;
    if (order?.shipping_method === "paxi") return `https://paxi.co.za/track?ref=${order.tracking_number}`;
    return `https://thecourierguy.co.za/tracking?track=${order.tracking_number}`;
  };

  const generateReceipt = () => {
    if (!order) return "";
    const addr = order.shipping_address || {};
    const items = order.items || [];
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${order.order_number}</title>
<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;max-width:620px;margin:0 auto;color:#111}
.header{background:#f97316;color:white;padding:28px 32px;border-radius:14px;margin-bottom:24px}
.header h1{margin:0;font-size:22px}.badge{display:inline-block;background:rgba(255,255,255,.2);padding:4px 12px;border-radius:100px;font-size:11px;font-weight:700;margin-top:8px}
.section{margin-bottom:16px;padding:16px;border:1px solid #e5e7eb;border-radius:10px}
.section h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}
.row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #f3f4f6}
.row:last-child{border:none}.label{color:#6b7280}
.grand{font-size:16px;font-weight:700;padding-top:10px;border-top:2px solid #111;color:#f97316}
.footer{text-align:center;margin-top:28px;color:#9ca3af;font-size:11px}
@media print{body{padding:0}}</style></head><body>
<div class="header"><h1>Hotshot Fabrics</h1><span class="badge">${order.order_number}</span><p style="margin:8px 0 0;opacity:.8;font-size:12px">${new Date(order.created_at).toLocaleDateString("en-ZA", { dateStyle: "full" })}</p></div>
<div class="section"><h3>Delivery Address</h3>
<div class="row"><span class="label">Name</span><span>${addr.full_name || "N/A"}</span></div>
<div class="row"><span class="label">Address</span><span>${addr.address_line1 || ""}${addr.city ? `, ${addr.city}` : ""}${addr.postal_code ? ` ${addr.postal_code}` : ""}</span></div>
<div class="row"><span class="label">Phone</span><span>${addr.phone || "N/A"}</span></div></div>
<div class="section"><h3>Items</h3>${items.map((i: any) => `<div class="row"><span>${i.product_name}${i.color_name ? ` (${i.color_name})` : ""} × ${i.quantity}</span><span>${formatCurrency(i.total_price)}</span></div>`).join("")}</div>
<div class="section"><h3>Payment</h3>
<div class="row"><span class="label">Method</span><span>${(order.payment_method || "").replace(/_/g, " ")}</span></div>
<div class="row"><span class="label">Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
<div class="row"><span class="label">Shipping</span><span>${order.shipping_cost === 0 ? "Free" : formatCurrency(order.shipping_cost)}</span></div>
${order.discount_applied ? `<div class="row" style="color:#10b981"><span>Discount</span><span>-${formatCurrency(order.discount_applied)}</span></div>` : ""}
<div class="row grand"><span>Total</span><span>${formatCurrency(order.total)}</span></div></div>
<div class="footer"><p><strong>Thank you for shopping with Hotshot Fabrics!</strong></p><p>WhatsApp: 083 416 0993</p></div>
</body></html>`;
  };

  const printReceipt = () => {
    const w = window.open("", "_blank");
    if (w) { w.document.write(generateReceipt()); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const downloadReceipt = () => {
    const blob = new Blob([generateReceipt()], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Receipt-${order?.order_number}.html`;
    a.click();
    toast("Receipt downloaded", "success");
  };

  // ─── Render guards ────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Order not found</h2>
          <button onClick={() => setCurrentView("orders")} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-all">
            My Orders
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const currentStep = STATUS_STEPS.findIndex(s => s.key === order.status);
  const progressPct = order.status === "cancelled" ? 0 : Math.max(0, Math.min(100, (currentStep / (STATUS_STEPS.length - 1)) * 100));
  const shipping = order.shipping_address || {};
  const isCancellable = ["pending", "confirmed"].includes(order.status);
  const trackingUrl = getTrackingUrl();
  const PayIcon = PAYMENT_ICONS[order.payment_method] || CreditCard;
  const visibleItems = showItemsAll ? order.items : order.items.slice(0, 3);

  return (
    <div className="min-h-screen pt-24 pb-20 bg-black">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* ── Top nav ─────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentView("orders")} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> My Orders
          </button>
          <div className="flex items-center gap-2">
            <button onClick={async () => { setRefreshing(true); await fetchOrder(); setRefreshing(false); toast("Refreshed", "success"); }}
              disabled={refreshing} className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={printReceipt} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Printer className="w-4 h-4 text-zinc-400" />
            </button>
            <button onClick={downloadReceipt} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Download className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* ── Order Header Card ────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className={`bg-zinc-900 border ${statusCfg.border} rounded-2xl p-5 sm:p-6 mb-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <Hash className="w-4 h-4 text-zinc-600" />
                <h1 className="text-xl sm:text-2xl font-black">{order.order_number}</h1>
                <button onClick={copyOrderNumber} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-500" />}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(order.created_at).toLocaleDateString("en-ZA", { dateStyle: "medium" })}
                </span>
                <span>·</span>
                <span>{order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <PayIcon className="w-3.5 h-3.5" />
                  {(order.payment_method || "").replace(/_/g, " ")}
                </span>
                <span>·</span>
                <span className={`font-semibold ${
                  order.payment_status === "paid" ? "text-emerald-400" :
                  order.payment_status === "awaiting_proof" ? "text-amber-400" :
                  "text-yellow-400"
                }`}>
                  {order.payment_status === "awaiting_proof" ? "AWAITING PROOF" : order.payment_status?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border} flex items-center gap-1.5`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {statusCfg.label}
              </div>
              <div className="text-xl font-black text-orange-400">{formatCurrency(order.total)}</div>
              {isCancellable && (
                <button onClick={() => setShowCancelConfirm(true)} disabled={cancelling}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50">
                  <XCircle className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Cancel confirm modal */}
        <AnimatePresence>
          {showCancelConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Cancel Order?</h3>
                    <p className="text-sm text-zinc-400">This cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold text-sm transition-all">
                    Keep It
                  </button>
                  <button onClick={cancelOrder} disabled={cancelling}
                    className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-semibold text-sm border border-red-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Cancel"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Progress Timeline ─────────────────────────────── */}
        {order.status !== "cancelled" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-orange-500" /> Order Progress
              </h2>
              <span className="text-xs text-zinc-500">{Math.round(progressPct)}% complete</span>
            </div>

            <div className="relative mb-6">
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-zinc-800 rounded-full" />
              <motion.div className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full origin-left"
                style={{ right: `${(1 - progressPct / 100) * (100 - (100 / STATUS_STEPS.length))}%` }}
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, ease: "easeOut" }} />
              <div className="relative flex justify-between">
                {STATUS_STEPS.map((step, i) => {
                  const isActive = i <= currentStep;
                  const isCurrent = i === currentStep;
                  const Ic = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 w-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                        isActive ? "bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20" : "bg-zinc-800"
                      } ${isCurrent ? "ring-4 ring-orange-500/20" : ""}`}>
                        <Ic className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-600"}`} />
                      </div>
                      <span className={`text-[10px] font-medium text-center leading-tight ${isActive ? "text-white" : "text-zinc-600"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tracking number */}
            {order.tracking_number && (
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                <Tag className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="font-mono text-sm text-orange-400 flex-1">{order.tracking_number}</span>
                <button onClick={() => { navigator.clipboard.writeText(order.tracking_number); toast("Copied!", "success"); }}
                  className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors">
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                </button>
                {trackingUrl && (
                  <button onClick={() => window.open(trackingUrl, "_blank")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-semibold border border-orange-500/20 transition-all">
                    <ExternalLink className="w-3 h-3" /> Track
                  </button>
                )}
              </div>
            )}

            {/* Tracking history */}
            {tracking.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Tracking History</p>
                <div className="space-y-3">
                  {tracking.slice(0, 5).map(t => (
                    <div key={t.id} className="flex gap-3 items-start">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200">{t.description || t.status?.replace(/_/g, " ")}</p>
                        {t.location && <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{t.location}</p>}
                        <p className="text-xs text-zinc-600 mt-0.5">{timeAgo(t.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Cancelled banner */}
        {order.status === "cancelled" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Ban className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="font-bold text-red-400">Order Cancelled</p>
              {order.cancelled_at && <p className="text-xs text-zinc-500 mt-0.5">Cancelled {timeAgo(order.cancelled_at)}</p>}
            </div>
          </motion.div>
        )}

        {/* ── Two-column layout ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Items + Chat */}
          <div className="lg:col-span-3 space-y-6">

            {/* Order Items */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-400" /> Order Items
                </h2>
                <span className="text-xs text-zinc-500">{order.items?.length || 0} items</span>
              </div>
              <div className="divide-y divide-zinc-800">
                {visibleItems.map((item: any) => (
                  <div key={item.id} className="p-4 flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{item.product_name}</p>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        {item.color_name && <span className="text-xs text-zinc-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" /> {item.color_name}</span>}
                        {item.size_name && <span className="text-xs text-zinc-500">Size: {item.size_name}</span>}
                        {item.product_sku && <span className="text-xs text-zinc-600 font-mono">#{item.product_sku}</span>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Qty {item.quantity} × {formatCurrency(item.unit_price)}</p>
                    </div>
                    <p className="font-bold text-sm text-orange-400 flex-shrink-0">{formatCurrency(item.total_price)}</p>
                  </div>
                ))}
              </div>

              {order.items?.length > 3 && (
                <button onClick={() => setShowItemsAll(v => !v)}
                  className="w-full py-3 text-xs text-zinc-400 hover:text-orange-400 flex items-center justify-center gap-1.5 border-t border-zinc-800 transition-colors">
                  {showItemsAll ? "Show fewer" : `Show all ${order.items.length} items`}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showItemsAll ? "rotate-180" : ""}`} />
                </button>
              )}

              {/* Order totals */}
              <div className="p-5 border-t border-zinc-800 bg-zinc-950/30 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-zinc-400">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">Shipping</span><span>{order.shipping_cost === 0 ? <span className="text-emerald-400">Free</span> : formatCurrency(order.shipping_cost)}</span></div>
                {order.discount_applied > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                    <span>-{formatCurrency(order.discount_applied)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-zinc-800">
                  <span>Total</span>
                  <span className="text-orange-400">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </motion.div>

            {/* Chat Section - FIXED */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Order Support Chat</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-xs text-zinc-500">Support online</span>
                  </div>
                </div>
              </div>

              <div className="h-80 overflow-y-auto p-4 space-y-3 bg-zinc-950/20">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center mb-3">
                      <Bot className="w-5 h-5 text-zinc-500" />
                    </div>
                    <p className="text-sm text-zinc-400 font-medium">No messages yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Send us a message about your order</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`flex items-start gap-2 group ${msg.sender_type === "customer" ? "justify-end flex-row-reverse" : "justify-start"}`}>
                    {msg.sender_type === "admin" && (
                      <div className="w-6 h-6 bg-orange-500/10 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                    )}
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.sender_type === "customer"
                        ? "bg-orange-500 text-white rounded-br-sm"
                        : "bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-bl-sm"
                    }`}>
                      {msg.sender_type === "admin" && <p className="text-[10px] font-bold text-orange-400 mb-1 uppercase tracking-wider">Support</p>}
                      <p className="leading-relaxed break-words">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender_type === "customer" ? "text-orange-200" : "text-zinc-500"}`}>
                        {timeAgo(msg.created_at)}
                      </p>
                    </div>
                    {msg.sender_type === "customer" && (
                      <button
                        onClick={() => deleteChatMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400 rounded-lg self-center flex-shrink-0"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <AnimatePresence>
                  {adminTyping && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                        <span className="text-xs text-zinc-400">Support is typing</span>
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-zinc-800 flex gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && !sendingChat && sendChatMessage()}
                  placeholder="Message support about this order..."
                  className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <button 
                  onClick={sendChatMessage} 
                  disabled={!newMessage.trim() || sendingChat}
                  className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 text-white rounded-xl transition-all flex items-center gap-2"
                >
                  {sendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right: Info panels */}
          <div className="lg:col-span-2 space-y-5">

            {/* Shipping Address */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-orange-400" /> Delivery Address
              </h2>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{shipping.full_name || "—"}</p>
                <p className="text-zinc-400">{shipping.address_line1 || "No address"}</p>
                {shipping.address_line2 && <p className="text-zinc-400">{shipping.address_line2}</p>}
                <p className="text-zinc-400">{[shipping.city, shipping.state, shipping.postal_code].filter(Boolean).join(", ")}</p>
                <p className="text-zinc-500 text-xs">{shipping.country || "South Africa"}</p>
                {shipping.phone && (
                  <div className="pt-2 mt-2 border-t border-zinc-800 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" />
                    <a href={`tel:${shipping.phone}`} className="text-zinc-300 hover:text-orange-400 transition-colors">{shipping.phone}</a>
                  </div>
                )}
              </div>
            </motion.div>

            {/* EFT Awaiting Proof of Payment */}
            {order.payment_method === "eft_bank_transfer" && order.payment_status === "awaiting_proof" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5">
                <h2 className="font-bold text-sm flex items-center gap-2 mb-3 text-amber-400">
                  <Building2 className="w-4 h-4" /> EFT Payment Pending
                </h2>
                <div className="space-y-1.5 text-sm mb-4">
                  <p><span className="text-zinc-400">Bank:</span> <span className="font-medium text-white">{storeSettings.bank_name}</span></p>
                  <p><span className="text-zinc-400">Account Name:</span> <span className="font-medium text-white">{storeSettings.bank_account_name}</span></p>
                  <p><span className="text-zinc-400">Account:</span> <span className="font-mono font-bold text-white">{storeSettings.bank_account}</span></p>
                  <p><span className="text-zinc-400">Branch:</span> <span className="font-medium text-white">{storeSettings.bank_branch}</span></p>
                  <p><span className="text-zinc-400">Reference:</span> <span className="font-mono font-bold text-orange-400">{order.order_number}</span></p>
                  <p><span className="text-zinc-400">Amount:</span> <span className="font-bold text-white">{formatCurrency(order.total)}</span></p>
                </div>
                <button
                  onClick={() => {
                    const num = storeSettings.whatsapp_number.replace(/\D/g, "");
                    const intl = num.startsWith("0") ? `27${num.slice(1)}` : num;
                    const msg = `*Proof of Payment — ${order.order_number}*\n\n*Customer:* ${order.shipping_address?.full_name || ""}\n*Amount:* ${formatCurrency(order.total)}\n*Reference:* ${order.order_number}\n\nPlease find my proof of payment attached.`;
                    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, "_blank");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-sm text-white transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send Proof of Payment via WhatsApp
                </button>
              </motion.div>
            )}

            {/* Receipt */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-orange-400" /> Receipt
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={printReceipt}
                  className="py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={downloadReceipt}
                  className="py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </motion.div>

            {/* Contact Support */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
                <Phone className="w-4 h-4 text-orange-400" /> Contact Support
              </h2>
              <div className="space-y-2">
                <button onClick={() => contactWhatsApp()}
                  className="w-full py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-emerald-600/20 transition-all">
                  <MessageCircle className="w-4 h-4" /> WhatsApp Us
                </button>
                <button onClick={() => window.open("mailto:support@hotshotfabrics.co.za", "_blank")}
                  className="w-full py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-blue-600/20 transition-all">
                  <Mail className="w-4 h-4" /> Email Support
                </button>
              </div>
              <p className="text-[10px] text-zinc-600 text-center mt-3">Reference: {order.order_number}</p>
            </motion.div>

            {/* Loyalty Points Earned */}
            {order.status === "delivered" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
                className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-orange-400">+{Math.floor(order.total / 10)} points earned!</p>
                    <p className="text-xs text-zinc-400">From this delivered order</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}