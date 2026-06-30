// ============================================================
// HOTSHOT FABRICS — PRO ADMIN ORDERS v5 (FULLY FIXED)
// Real-time | Typing Indicators | Admin Presence | Payment |
// Receipts | WhatsApp/Email | Delivery Services | Product Images
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../AppContext";
import {
  Search, Eye, Package, Truck, CheckCircle, XCircle, Clock,
  Download, Printer, RefreshCw, TrendingUp, ShoppingBag,
  ArrowUpDown, X, Check, Loader2, MessageSquare, MapPin,
  User, Phone, Mail, ChevronLeft, ChevronRight,
  Calendar, Layers, Zap, Send, Copy, FileText, AlertTriangle,
  Info, ImageIcon, Palette, Ruler, Hash,
  Bus, Store, Car, Navigation, PackageCheck,
  CreditCard, Banknote, CircleDollarSign, ClipboardList,
  RotateCcw, CheckCheck, BadgeCheck, DollarSign,
  Radio, Wifi, TruckIcon
} from "lucide-react";

// ==================== TYPES ====================
interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_cost: number;
  discount_applied?: number;
  discount_amount?: number;
  total: number;
  created_at: string;
  updated_at?: string;
  notes?: string;
  coupon_code?: string;
  delivery_speed?: string;
  tracking_number?: string;
  tracking_url?: string;
  shipping_method?: string;
  delivery_service?: string;
  estimated_delivery?: string;
  courier_name?: string;
  payment_method?: string;
  shipping_address?: ShippingAddress;
  items?: OrderItem[];
}

interface ShippingAddress {
  full_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  color_name?: string;
  size_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ChatMessage {
  id: string;
  order_id: string;
  sender_type: "admin" | "customer";
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface TrackingEntry {
  id: string;
  order_id: string;
  status: string;
  description: string;
  location?: string;
  is_customer_visible: boolean;
  created_at: string;
}

interface DeliveryService {
  id: string;
  name: string;
  type: string;
  website?: string;
  phone?: string;
  is_active: boolean;
}

type AdminAvailability = "available" | "busy" | "away";
type ToastType = "success" | "error" | "info";

// ==================== CONSTANTS ====================
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  pending:          { label: "Pending",          color: "text-yellow-400",  bg: "bg-yellow-400/10",  border: "border-yellow-400/20",  icon: Clock },
  confirmed:        { label: "Confirmed",         color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20",    icon: CheckCircle },
  preparing:        { label: "Preparing",         color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20",  icon: Layers },
  processing:       { label: "Processing",        color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20",  icon: Layers },
  ready_for_delivery: { label: "Ready",           color: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/20",    icon: PackageCheck },
  out_for_delivery: { label: "Out for Delivery",  color: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-400/20",  icon: Truck },
  shipped:          { label: "Shipped",           color: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-400/20",  icon: Truck },
  delivered:        { label: "Delivered",         color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: CheckCircle },
  cancelled:        { label: "Cancelled",         color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/20",     icon: XCircle },
  refunded:         { label: "Refunded",          color: "text-zinc-400",    bg: "bg-zinc-400/10",    border: "border-zinc-400/20",    icon: CircleDollarSign },
  returned:         { label: "Returned",          color: "text-zinc-400",    bg: "bg-zinc-400/10",    border: "border-zinc-400/20",    icon: RotateCcw },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  pending:  { label: "Awaiting Payment",   color: "text-yellow-400",  bg: "bg-yellow-400/10",  border: "border-yellow-400/20",  icon: Clock },
  paid:     { label: "Payment Received",   color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: BadgeCheck },
  failed:   { label: "Payment Failed",     color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/20",     icon: AlertTriangle },
  refunded: { label: "Refunded",           color: "text-zinc-400",    bg: "bg-zinc-400/10",    border: "border-zinc-400/20",    icon: CircleDollarSign },
};

const DELIVERY_OPTIONS = [
  { value: "courier", label: "Courier",      icon: TruckIcon },
  { value: "paxi",    label: "Paxi",         icon: Bus },
  { value: "pickup",  label: "Self Pickup",  icon: Store },
  { value: "own",     label: "Own Delivery", icon: Car },
];

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// ==================== UTILS ====================
const fmt = (n: number) => `R${(n || 0).toFixed(2)}`;
const dt = (d: string) => {
  try { return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};
const ago = (d: string) => {
  try {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch { return d; }
};

// NEW helper for WhatsApp number formatting
const cleanPhoneForWhatsApp = (raw: string): string => {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  // Remove any leading zeros, then check if already starts with 27
  digits = digits.replace(/^0+/, "");
  if (digits.startsWith("27")) return digits;
  // Otherwise prepend SA country code
  return "27" + digits;
};

// ==================== RECEIPT HTML ====================
function generateReceipt(order: Order): string {
  const a = order.shipping_address || {};
  const items = order.items || [];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Receipt — ${order.order_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#f0f2f5;padding:24px;color:#111827}
.wrap{max-width:640px;margin:0 auto}
.card{background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.12);overflow:hidden;margin-bottom:16px}
.brand{background:linear-gradient(135deg,#ea580c,#dc2626);padding:40px 36px;color:#fff;position:relative;overflow:hidden}
.brand::before{content:'';position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.08)}
.brand::after{content:'';position:absolute;bottom:-60px;left:-20px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.06)}
.brand h1{font-size:28px;font-weight:900;letter-spacing:-.5px;position:relative}
.brand p{font-size:13px;opacity:.8;margin-top:4px;letter-spacing:2px;text-transform:uppercase;position:relative}
.badge{display:inline-block;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:6px 14px;font-size:14px;font-weight:700;margin-top:16px;font-family:monospace;position:relative}
.body{padding:32px 36px}
.sec{margin-bottom:28px}
.sec-title{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #f3f4f6}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f9fafb;font-size:13.5px;align-items:center}
.row:last-child{border-bottom:none}
.label{color:#6b7280}
.value{font-weight:600;color:#111827;text-align:right;max-width:60%}
.sbadge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.s-ok{background:#d1fae5;color:#065f46}.s-warn{background:#fef3c7;color:#92400e}.s-info{background:#dbeafe;color:#1e40af}
table{width:100%;border-collapse:collapse}
thead tr{background:#f9fafb}
th{padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700}
td{padding:14px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;vertical-align:top}
tr:last-child td{border-bottom:none}
.pname{font-weight:600;color:#111827;margin-bottom:2px}
.pvar{font-size:11px;color:#9ca3af}
.totals{background:#f9fafb;border-radius:14px;padding:20px}
.trow{display:flex;justify-content:space-between;padding:7px 0;font-size:13.5px;color:#4b5563}
.trow.grand{font-size:20px;font-weight:900;color:#ea580c;border-top:2px solid #e5e7eb;margin-top:12px;padding-top:16px}
.footer{text-align:center;padding:28px 36px;background:#f9fafb;border-top:1px solid #f3f4f6}
.footer p{font-size:12px;color:#9ca3af;line-height:1.8}
.footer strong{color:#374151}
@media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}
</style></head><body>
<div class="wrap"><div class="card">
<div class="brand"><h1>Hotshot Fabrics</h1><p>Official Receipt</p><div class="badge">${order.order_number}</div></div>
<div class="body">
<div class="sec"><div class="sec-title">Order Details</div>
<div class="row"><span class="label">Order Number</span><span class="value" style="font-family:monospace;font-weight:900">${order.order_number}</span></div>
<div class="row"><span class="label">Date</span><span class="value">${dt(order.created_at)}</span></div>
<div class="row"><span class="label">Status</span><span class="value"><span class="sbadge ${order.status === "delivered" ? "s-ok" : ["shipped", "out_for_delivery"].includes(order.status) ? "s-info" : "s-warn"}">${STATUS_CONFIG[order.status]?.label || order.status}</span></span></div>
<div class="row"><span class="label">Payment</span><span class="value"><span class="sbadge ${order.payment_status === "paid" ? "s-ok" : "s-warn"}">${PAYMENT_CONFIG[order.payment_status]?.label || order.payment_status}</span></span></div>
${order.tracking_number ? `<div class="row"><span class="label">Tracking #</span><span class="value" style="font-family:monospace">${order.tracking_number}</span></div>` : ""}
${order.delivery_service ? `<div class="row"><span class="label">Delivered Via</span><span class="value">${order.delivery_service}</span></div>` : ""}
${order.estimated_delivery ? `<div class="row"><span class="label">Est. Delivery</span><span class="value">${new Date(order.estimated_delivery).toLocaleDateString("en-ZA", { dateStyle: "medium" })}</span></div>` : ""}
</div>
<div class="sec"><div class="sec-title">Customer</div>
<div class="row"><span class="label">Name</span><span class="value">${a.full_name || "N/A"}</span></div>
${a.email ? `<div class="row"><span class="label">Email</span><span class="value">${a.email}</span></div>` : ""}
${a.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${a.phone}</span></div>` : ""}
<div class="row"><span class="label">Address</span><span class="value">${[a.address_line1, a.address_line2, a.city, a.postal_code].filter(Boolean).join(", ") || "N/A"}</span></div>
</div>
<div class="sec"><div class="sec-title">Items (${items.length})</div>
<table class="w-full"><thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>
${items.map(i => `<tr><td><div class="pname">${i.product_name}</div>${i.color_name || i.size_name ? `<div class="pvar">${[i.color_name, i.size_name].filter(Boolean).join(" · ")}</div>` : ""}</td><td style="text-align:center;font-weight:700">${i.quantity}</td><td style="text-align:right;color:#6b7280">${fmt(i.unit_price)}</td><td style="text-align:right;font-weight:800;color:#111827">${fmt(i.total_price)}</td></tr>`).join("")}
</tbody></table></div>
<div class="totals">
<div class="trow"><span>Subtotal</span><span>${fmt(order.subtotal || 0)}</span></div>
<div class="trow"><span>Shipping</span><span>${(order.shipping_cost || 0) === 0 ? '<span style="color:#10b981">Free</span>' : fmt(order.shipping_cost || 0)}</span></div>
${order.discount_applied || order.discount_amount ? `<div class="trow" style="color:#10b981"><span>Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}</span><span>-${fmt(order.discount_applied || order.discount_amount || 0)}</span></div>` : ""}
<div class="trow grand"><span>TOTAL</span><span>${fmt(order.total || 0)}</span></div>
</div></div>
<div class="footer"><p><strong>Thank you for shopping with Hotshot Fabrics!</strong></p>
<p style="margin-top:8px">WhatsApp: 083 416 0993 &nbsp;·&nbsp; info@hotshotfabrics.co.za</p>
<p style="margin-top:4px">hotshotfabrics.co.za</p></div>
</div></div></body></html>`;
}

// ==================== SUB-COMPONENTS ====================
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const I = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${c.color} ${c.bg} ${c.border}`}>
      <I className="w-3 h-3" />{c.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const c = PAYMENT_CONFIG[status] || PAYMENT_CONFIG.pending;
  const I = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border ${c.color} ${c.bg} ${c.border}`}>
      <I className="w-3 h-3" />{c.label}
    </span>
  );
}

function ItemImage({ item, size = "md" }: { item: OrderItem; size?: "sm" | "md" | "lg" }) {
  const sz = { sm: "w-10 h-10", md: "w-14 h-14", lg: "w-20 h-20" };
  const ic = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-8 h-8" };
  const [err, setErr] = useState(false);
  
  const getImageUrl = () => {
    if (!item.product_image) return null;
    if (item.product_image.startsWith('http')) return item.product_image;
    if (item.product_image.startsWith('/storage')) {
      const { data } = supabase.storage.from('products').getPublicUrl(item.product_image);
      return data.publicUrl;
    }
    return item.product_image;
  };
  
  const imageUrl = getImageUrl();
  
  return (
    <div className={`${sz[size]} bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700/50`}>
      {imageUrl && !err ? (
        <img src={imageUrl} alt={item.product_name} className="w-full h-full object-cover" onError={() => setErr(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className={`${ic[size]} text-zinc-600`} />
        </div>
      )}
    </div>
  );
}

function ToastNotif({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const styles = {
    success: "bg-emerald-950/90 border-emerald-500/40 text-emerald-300",
    error: "bg-red-950/90 border-red-500/40 text-red-300",
    info: "bg-blue-950/90 border-blue-500/40 text-blue-300",
  };
  const icons = { success: CheckCircle, error: AlertTriangle, info: Info };
  const Icon = icons[type];
  return (
    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl max-w-sm ${styles[type]}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-70"><X className="w-4 h-4" /></button>
    </motion.div>
  );
}

// ==================== ADMIN PRESENCE HOOK ====================
function useAdminPresence() {
  const [availability, setAvailability] = useState<AdminAvailability>("available");
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel("admin_presence_global", { config: { presence: { key: "admin" } } });
    channel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user: "admin", status: "available", online_at: new Date().toISOString() });
      }
    });
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, []);

  const updateAvailability = async (status: AdminAvailability) => {
    setAvailability(status);
    if (channelRef.current) {
      await channelRef.current.track({ user: "admin", status, online_at: new Date().toISOString() });
    }
  };

  return { availability, updateAvailability };
}

// ==================== ORDER DETAIL DRAWER ====================
function OrderDrawer({
  order, onClose, onStatusChange, onPaymentChange, adminAvailability,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (id: string, status: string, data?: any) => Promise<void>;
  onPaymentChange: (id: string, status: string) => Promise<void>;
  adminAvailability: AdminAvailability;
}) {
  const [tab, setTab] = useState<"overview" | "items" | "chat" | "tracking">("overview");
  const [selStatus, setSelStatus] = useState(order.status);
  const [updating, setUpdating] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [trackNo, setTrackNo] = useState(order.tracking_number || "");
  const [trackUrl, setTrackUrl] = useState(order.tracking_url || "");
  const [shipMethod, setShipMethod] = useState(order.shipping_method || "courier");
  const [delService, setDelService] = useState(order.delivery_service || "");
  const [estDelivery, setEstDelivery] = useState(order.estimated_delivery?.split("T")[0] || "");
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tracking, setTracking] = useState<TrackingEntry[]>([]);
  const [services, setServices] = useState<DeliveryService[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newTrackDesc, setNewTrackDesc] = useState("");
  const [newTrackLoc, setNewTrackLoc] = useState("");
  const [addingTrack, setAddingTrack] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);
  const addr = order.shipping_address || {};

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    supabase.from("delivery_services").select("*").eq("is_active", true).then(r => setServices(r.data || []));
  }, []);

  useEffect(() => {
    if (tab !== "chat") return;
    supabase.from("order_chats").select("*").eq("order_id", order.id).order("created_at", { ascending: true })
      .then(r => {
        setChats(r.data || []);
        setUnreadCount(0);
        supabase.from("order_chats").update({ is_read: true }).eq("order_id", order.id).eq("sender_type", "customer").then(() => {});
      });
  }, [tab, order.id]);

  useEffect(() => {
    if (tab !== "tracking") return;
    supabase.from("order_tracking").select("*").eq("order_id", order.id).order("created_at", { ascending: false })
      .then(r => setTracking(r.data || []));
  }, [tab, order.id]);

  useEffect(() => {
    const ch = supabase.channel(`order_chat_${order.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_chats", filter: `order_id=eq.${order.id}` },
        (p) => {
          setChats(prev => [...prev, p.new as ChatMessage]);
          if (p.new.sender_type === "customer" && tab !== "chat") setUnreadCount(c => c + 1);
        })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [order.id, tab]);

  useEffect(() => {
    const ch = supabase.channel(`typing_${order.id}`)
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload?.sender === "customer") {
          setCustomerTyping(true);
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setCustomerTyping(false), 3000);
        }
      })
      .subscribe();
    typingChannelRef.current = ch;
    return () => {
      clearTimeout(typingTimerRef.current);
      ch.unsubscribe();
    };
  }, [order.id]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chats, customerTyping]);

  const handleMsgChange = (value: string) => {
    setMsg(value);
    if (typingChannelRef.current) {
      typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { sender: "admin", typing: value.length > 0 } });
    }
  };

  const sendChat = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    if (typingChannelRef.current) {
      typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { sender: "admin", typing: false } });
    }
    try {
      const { error } = await supabase.from("order_chats").insert({
        order_id: order.id, sender_type: "admin", sender_name: "Hotshot Admin", message: msg.trim(), is_read: false,
      });
      if (error) throw error;
      setMsg("");
      showToast("Message sent!", "success");
    } catch (err) {
      showToast("Failed to send message", "error");
    }
    finally { setSending(false); }
  };

  const handleStatusUpdate = async () => {
    setUpdating(true);
    const data = ["shipped", "out_for_delivery", "ready_for_delivery"].includes(selStatus)
      ? { tracking_number: trackNo, tracking_url: trackUrl, shipping_method: shipMethod, delivery_service: delService, estimated_delivery: estDelivery || null, courier_name: delService }
      : undefined;
    await onStatusChange(order.id, selStatus, data);
    setUpdating(false);
    showToast(`Status updated to ${STATUS_CONFIG[selStatus]?.label}`);
  };

  const handlePaymentToggle = async () => {
    setUpdatingPayment(true);
    const next = order.payment_status === "paid" ? "pending" : "paid";
    await onPaymentChange(order.id, next);
    setUpdatingPayment(false);
    showToast(next === "paid" ? "Payment marked as received!" : "Payment reset to pending", next === "paid" ? "success" : "info");
  };

  const addTrackingUpdate = async () => {
    if (!newTrackDesc.trim()) return;
    setAddingTrack(true);
    try {
      const { data, error } = await supabase.from("order_tracking").insert({
        order_id: order.id, status: selStatus, description: newTrackDesc.trim(),
        location: newTrackLoc.trim() || null, is_customer_visible: true,
      }).select().single();
      if (!error && data) { setTracking(prev => [data, ...prev]); setNewTrackDesc(""); setNewTrackLoc(""); showToast("Tracking update added"); }
      else throw error;
    } catch (err) {
      showToast("Failed to add update", "error");
    }
    finally { setAddingTrack(false); }
  };

  const whatsapp = () => {
    const phoneDigits = cleanPhoneForWhatsApp(addr.phone || "");
    if (!phoneDigits) { showToast("No phone number on file", "error"); return; }
    const itemsText = (order.items || []).slice(0, 3).map(i => `• ${i.product_name}${i.size_name ? ` (${i.size_name})` : ""} ×${i.quantity}`).join("\n");
    const m = `🔥 *Hotshot Fabrics — Order Update*\n\nHi ${addr.full_name || "Customer"}! 👋\n\nYour order *${order.order_number}* is now *${STATUS_CONFIG[selStatus]?.label || selStatus}*.\n\n*Items ordered:*\n${itemsText}\n\n*Total: ${fmt(order.total || 0)}*${trackNo ? `\n\n📦 *Tracking #:* \`${trackNo}\`` : ""}${order.tracking_url ? `\n🔗 Track here: ${order.tracking_url}` : ""}${estDelivery ? `\n🗓 *Est. Delivery:* ${new Date(estDelivery).toLocaleDateString("en-ZA", { dateStyle: "medium" })}` : ""}\n\nThank you for shopping with Hotshot Fabrics! 🙌`;
    window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(m)}`, "_blank");
  };

  const emailUpdate = () => {
    if (!addr.email) { showToast("No email address on file", "error"); return; }
    const subject = `Your Hotshot Fabrics Order ${order.order_number} — ${STATUS_CONFIG[selStatus]?.label || selStatus}`;
    const body = `Hi ${addr.full_name || "Customer"},\r\n\r\nYour Hotshot Fabrics order ${order.order_number} has been updated!\r\n\r\nStatus: ${STATUS_CONFIG[order.status]?.label || order.status}\r\nTotal: ${fmt(order.total || 0)}${trackNo ? `\r\nTracking #: ${trackNo}` : ""}${estDelivery ? `\r\nEst. Delivery: ${new Date(estDelivery).toLocaleDateString("en-ZA")}` : ""}\r\n\r\nThank you for your order!\r\nHotshot Fabrics Team\r\n083 416 0993 | info@hotshotfabrics.co.za`;
    window.open(`mailto:${addr.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  const printReceipt = () => { const w = window.open("", "_blank"); if (w) { w.document.write(generateReceipt(order)); w.document.close(); setTimeout(() => w.print(), 500); } };
  const downloadReceipt = () => {
    const b = new Blob([generateReceipt(order)], { type: "text/html" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `Receipt-${order.order_number}.html`; a.click();
    showToast("Receipt downloaded!");
  };

  const availDotColor: Record<AdminAvailability, string> = { available: "bg-emerald-400", busy: "bg-orange-400", away: "bg-zinc-500" };
  const availLabel: Record<AdminAvailability, string> = { available: "Available", busy: "Busy", away: "Away" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl">

        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 px-6 py-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Order Detail</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">
                  <div className={`w-1.5 h-1.5 rounded-full ${availDotColor[adminAvailability]} ${adminAvailability === "available" ? "animate-pulse" : ""}`} />
                  <span className="text-[10px] text-zinc-400 font-medium">Admin {availLabel[adminAvailability]}</span>
                </div>
              </div>
              <h2 className="font-black text-xl text-white font-mono tracking-wide">{order.order_number}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{dt(order.created_at)} · {ago(order.created_at)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={whatsapp} className="p-2 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-all"><MessageSquare className="w-4 h-4" /></button>
              <button onClick={emailUpdate} className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-all"><Mail className="w-4 h-4" /></button>
              <button onClick={printReceipt} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg"><Printer className="w-4 h-4" /></button>
              <button onClick={downloadReceipt} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg"><Download className="w-4 h-4" /></button>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg ml-1"><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
          </div>

          <div className="flex gap-1 bg-zinc-900/60 p-1 rounded-xl">
            {[
              { id: "overview", label: "Overview", icon: ClipboardList, count: null },
              { id: "items",    label: "Items",    icon: Package,      count: order.items?.length || 0 },
              { id: "chat",     label: "Chat",     icon: MessageSquare, count: unreadCount },
              { id: "tracking", label: "Tracking", icon: Navigation,   count: null },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === t.id ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                {t.count !== null && t.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${t.id === "chat" && unreadCount > 0 ? "bg-orange-500 text-white" : "bg-orange-500/20 text-orange-400"}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "overview" && (
            <>
              <div className="flex flex-wrap items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                <StatusBadge status={order.status} />
                <PaymentBadge status={order.payment_status} />
                {order.delivery_speed && <span className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400"><Zap className="w-3 h-3" />{order.delivery_speed}</span>}
                {order.payment_method && <span className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400"><CreditCard className="w-3 h-3" />{order.payment_method.replace(/_/g, " ")}</span>}
                {order.delivery_service && <span className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400"><Truck className="w-3 h-3" />{order.delivery_service}</span>}
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-3">Payment Confirmation</h3>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{order.payment_status === "paid" ? "Payment received & confirmed" : "Payment not yet confirmed"}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Total: <span className="text-orange-400 font-black">{fmt(order.total || 0)}</span></p>
                  </div>
                  <button onClick={handlePaymentToggle} disabled={updatingPayment}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all flex-shrink-0 border ${
                      order.payment_status === "paid"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-500/10"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-emerald-500/10"
                    }`}>
                    {updatingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : order.payment_status === "paid" ? <><BadgeCheck className="w-4 h-4" />Paid</> : <><DollarSign className="w-4 h-4" />Mark Paid</>}
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-4">Update Order Status</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {ALL_STATUSES.map(s => {
                    const c = STATUS_CONFIG[s];
                    if (!c) return null;
                    const sel = selStatus === s;
                    return (
                      <button key={s} onClick={() => setSelStatus(s)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${sel ? `${c.bg} ${c.border} ${c.color}` : "border-zinc-800 text-zinc-500"}`}>
                        <c.icon className="w-3.5 h-3.5" /><span>{c.label}</span>
                        {sel && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                {["shipped", "out_for_delivery", "ready_for_delivery"].includes(selStatus) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                    <div className="space-y-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl mb-4">
                      <p className="text-xs text-blue-400 font-bold">Shipping Details</p>
                      <div>
                        <label className="text-xs text-zinc-500">Delivery Method</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {DELIVERY_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            return (
                              <button key={opt.value} onClick={() => { setShipMethod(opt.value); setDelService(""); }}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${shipMethod === opt.value ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "border-zinc-700"}`}>
                                <Icon className="w-3.5 h-3.5" />{opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {services.filter(s => s.type === shipMethod).length > 0 && (
                        <div>
                          <label className="text-xs text-zinc-500">Service Provider</label>
                          <select value={delService} onChange={e => setDelService(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                            <option value="">Select service...</option>
                            {services.filter(s => s.type === shipMethod).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-zinc-500">Tracking Number</label>
                        <input type="text" value={trackNo} onChange={e => setTrackNo(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500">Estimated Delivery</label>
                        <input type="date" value={estDelivery} onChange={e => setEstDelivery(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                      </div>
                    </div>
                  </motion.div>
                )}

                <button onClick={handleStatusUpdate} disabled={updating || selStatus === order.status}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Apply Status Update
                </button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Customer</h3>
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl mb-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{addr.full_name || "—"}</p>
                    <p className="text-xs text-zinc-400">{addr.email || "—"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {addr.phone && <div className="flex items-center gap-2 text-sm text-zinc-400"><Phone className="w-3.5 h-3.5" />{addr.phone}</div>}
                  {addr.address_line1 && <div className="flex items-start gap-2 text-sm text-zinc-400"><MapPin className="w-3.5 h-3.5" />{[addr.address_line1, addr.city].filter(Boolean).join(", ")}</div>}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmt(order.subtotal || 0)}</span></div>
                  <div className="flex justify-between text-sm"><span>Shipping</span><span>{fmt(order.shipping_cost || 0)}</span></div>
                  {order.discount_applied ? <div className="flex justify-between text-sm text-emerald-400"><span>Discount</span><span>-{fmt(order.discount_applied)}</span></div> : null}
                  <div className="flex justify-between font-black pt-2 border-t border-zinc-800"><span>Total</span><span className="text-orange-400">{fmt(order.total || 0)}</span></div>
                </div>
              </div>
            </>
          )}

          {tab === "items" && (
            <div className="space-y-4">
              {(order.items || []).map((item, i) => (
                <div key={item.id || i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex gap-4">
                    <ItemImage item={item} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{item.product_name}</p>
                      <div className="flex gap-2 mt-2">
                        {item.color_name && <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded"><Palette className="w-3 h-3 inline" /> {item.color_name}</span>}
                        {item.size_name && <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded"><Ruler className="w-3 h-3 inline" /> {item.size_name}</span>}
                      </div>
                      <div className="flex justify-between mt-3">
                        <span className="text-sm text-zinc-400">{fmt(item.unit_price)} × {item.quantity}</span>
                        <span className="text-orange-400 font-bold">{fmt(item.total_price)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "chat" && (
            <div className="flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {chats.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-4 py-2 ${m.sender_type === "admin" ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-200"}`}>
                      <p className="text-sm">{m.message}</p>
                      <p className="text-[10px] opacity-70 mt-1">{ago(m.created_at)}</p>
                    </div>
                  </div>
                ))}
                {customerTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 rounded-xl px-4 py-2">
                      <p className="text-sm text-zinc-400">Customer is typing...</p>
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <div className="flex gap-2">
                <input type="text" value={msg} onChange={e => handleMsgChange(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                <button onClick={sendChat} disabled={!msg.trim() || sending}
                  className="px-4 py-2 bg-orange-500 rounded-lg">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {tab === "tracking" && (
            <div className="space-y-4">
              <div className="bg-zinc-900 rounded-xl p-4">
                <input type="text" value={newTrackDesc} onChange={e => setNewTrackDesc(e.target.value)}
                  placeholder="Update description..."
                  className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm mb-2" />
                <button onClick={addTrackingUpdate} disabled={addingTrack}
                  className="w-full py-2 bg-orange-500 rounded-lg text-sm font-medium">
                  {addingTrack ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Update"}
                </button>
              </div>
              <div className="space-y-3">
                {tracking.map((t) => (
                  <div key={t.id} className="bg-zinc-900 rounded-xl p-3">
                    <p className="text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-zinc-500 mt-1">{ago(t.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {toast && <ToastNotif message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================
export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortField, setSortField] = useState<"created_at" | "total">("created_at");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPayment, setBulkPayment] = useState("");
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, shipped: 0, revenue: 0, today: 0 });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const { availability, updateAvailability } = useAdminPresence();
  const PAGE_SIZE = 15;

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order(sortField, { ascending: sortDir === "asc" });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (paymentFilter !== "all") query = query.eq("payment_status", paymentFilter);
      if (search.trim()) query = query.ilike("order_number", `%${search.trim()}%`);

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data: ordersData, error: ordersError, count } = await query;
      if (ordersError) throw ordersError;
      
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const orderIds = ordersData.map(order => order.id);
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      const itemsByOrder = new Map();
      if (orderItems) {
        orderItems.forEach(item => {
          if (!itemsByOrder.has(item.order_id)) {
            itemsByOrder.set(item.order_id, []);
          }
          itemsByOrder.get(item.order_id).push(item);
        });
      }

      const ordersWithItems = ordersData.map(order => ({
        ...order,
        items: itemsByOrder.get(order.id) || []
      }));

      setOrders(ordersWithItems);
      setTotalCount(count || 0);
    } catch (err: any) {
      showToast("Failed to load orders", "error");
    } finally { 
      setLoading(false); 
    }
  }, [search, statusFilter, paymentFilter, sortField, sortDir, page, showToast]);

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date(); 
      today.setHours(0, 0, 0, 0);
      
      const { count: total } = await supabase.from("orders").select("*", { count: "exact", head: true });
      const { count: pending } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: processing } = await supabase.from("orders").select("*", { count: "exact", head: true }).or("status.eq.processing,status.eq.preparing");
      const { count: shipped } = await supabase.from("orders").select("*", { count: "exact", head: true }).or("status.eq.shipped,status.eq.out_for_delivery");
      const { count: todayOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString());
      
      const { data: revenueData } = await supabase
        .from("orders")
        .select("total")
        .not("status", "in", '("cancelled","refunded","returned")');
      
      const revenue = (revenueData || []).reduce((sum, o) => sum + (o.total || 0), 0);
      
      setStats({
        total: total || 0,
        pending: pending || 0,
        processing: processing || 0,
        shipped: shipped || 0,
        revenue: revenue,
        today: todayOrders || 0,
      });
    } catch (err) {
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const channel = supabase
      .channel("admin_orders_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
        fetchStats();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        fetchOrders();
      })
      .subscribe();
    
    return () => { channel.unsubscribe(); };
  }, [fetchOrders, fetchStats]);

  const updateStatus = async (id: string, status: string, data?: any) => {
    try {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (data) Object.assign(updates, data);
      
      const { error } = await supabase.from("orders").update(updates).eq("id", id);
      if (error) throw error;
      
      await supabase.from("order_tracking").insert({
        order_id: id,
        status,
        description: `Order status updated to ${STATUS_CONFIG[status]?.label || status}`,
        is_customer_visible: true
      });
      
      fetchOrders();
      fetchStats();
      showToast(`Status updated to ${STATUS_CONFIG[status]?.label}`);
    } catch (err) {
      showToast("Status update failed", "error");
    }
  };

  const updatePayment = async (id: string, paymentStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: paymentStatus } : o));
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => prev ? { ...prev, payment_status: paymentStatus } : null);
      }
      
      showToast(`Payment updated to ${paymentStatus === "paid" ? "Received" : "Pending"}`);
    } catch (err) {
      showToast("Payment update failed", "error");
    }
  };

  const exportCSV = () => {
    const headers = ["Order #", "Date", "Customer", "Email", "Status", "Payment", "Items", "Total"];
    const rows = orders.map(o => [
      o.order_number,
      dt(o.created_at),
      o.shipping_address?.full_name || "—",
      o.shipping_address?.email || "—",
      o.status,
      o.payment_status,
      o.items?.length || 0,
      fmt(o.total || 0)
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported!");
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const toggleBulk = (id: string) => {
    const newSet = new Set(bulkSelected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setBulkSelected(newSet);
  };

  const toggleAll = () => {
    if (bulkSelected.size === orders.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(orders.map(o => o.id)));
    }
  };

  // Enhanced bulk update: supports both status and payment, uses batch insert for tracking
  const bulkUpdateStatus = async () => {
    if ((!bulkStatus && !bulkPayment) || bulkSelected.size === 0) return;
    setApplyingBulk(true);
    try {
      const ids = Array.from(bulkSelected);
      const updates: any = { updated_at: new Date().toISOString() };
      if (bulkStatus) updates.status = bulkStatus;
      if (bulkPayment) updates.payment_status = bulkPayment;

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .in("id", ids);

      if (error) throw error;

      // Batch insert tracking entries if status changed
      if (bulkStatus) {
        const trackingEntries = ids.map(id => ({
          order_id: id,
          status: bulkStatus,
          description: `Bulk update — status changed to ${STATUS_CONFIG[bulkStatus]?.label || bulkStatus}`,
          is_customer_visible: true
        }));
        await supabase.from("order_tracking").insert(trackingEntries);
      }

      fetchOrders();
      fetchStats();
      setBulkSelected(new Set());
      setBulkStatus("");
      setBulkPayment("");
      showToast(`Updated ${ids.length} order(s)`);
    } catch (err) {
      showToast("Bulk update failed", "error");
    } finally {
      setApplyingBulk(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Orders</h1>
          <p className="text-zinc-500 text-sm">{totalCount} total orders</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className={`w-2 h-2 rounded-full ${availability === "available" ? "bg-emerald-400 animate-pulse" : availability === "busy" ? "bg-orange-400" : "bg-zinc-500"}`} />
            <select value={availability} onChange={e => updateAvailability(e.target.value as AdminAvailability)}
              className="bg-transparent text-sm focus:outline-none">
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="away">Away</option>
            </select>
          </div>
          <button onClick={() => { fetchOrders(); fetchStats(); }} 
            className="p-2 bg-zinc-800 rounded-xl hover:bg-zinc-700">
            <RefreshCw className="w-5 h-5 text-zinc-400" />
          </button>
          <button onClick={exportCSV} 
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-400/10" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
          { label: "Processing", value: stats.processing, icon: Layers, color: "text-purple-400", bg: "bg-purple-400/10" },
          { label: "Shipping", value: stats.shipped, icon: Truck, color: "text-orange-400", bg: "bg-orange-400/10" },
          { label: "Today", value: stats.today, icon: Calendar, color: "text-pink-400", bg: "bg-pink-400/10" },
          { label: "Revenue", value: stats.revenue >= 1000 ? `R${(stats.revenue / 1000).toFixed(1)}k` : fmt(stats.revenue), 
            icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" }
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by order number..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm">
          <option value="all">All Status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
        </select>
        <select value={paymentFilter} onChange={e => { setPaymentFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm">
          <option value="all">All Payments</option>
          {Object.keys(PAYMENT_CONFIG).map(k => <option key={k} value={k}>{PAYMENT_CONFIG[k].label}</option>)}
        </select>
      </div>

      {/* Bulk Actions — now supports both status and payment */}
      {bulkSelected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
          <span className="text-sm font-medium text-orange-400">{bulkSelected.size} selected</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm">
            <option value="">Change status...</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
          </select>
          <select value={bulkPayment} onChange={e => setBulkPayment(e.target.value)}
            className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm">
            <option value="">Change payment...</option>
            {Object.keys(PAYMENT_CONFIG).map(k => <option key={k} value={k}>{PAYMENT_CONFIG[k].label}</option>)}
          </select>
          <button onClick={bulkUpdateStatus} disabled={(!bulkStatus && !bulkPayment) || applyingBulk}
            className="px-4 py-1.5 bg-orange-500 rounded-lg text-sm font-medium disabled:opacity-50">
            {applyingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
          </button>
          <button onClick={() => { setBulkSelected(new Set()); setBulkStatus(""); setBulkPayment(""); }} className="text-sm text-zinc-500">Clear</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-800">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={bulkSelected.size === orders.length && orders.length > 0} 
                      onChange={toggleAll} className="accent-orange-500" />
                  </th>
                  <th className="text-left text-xs font-bold text-zinc-500 uppercase px-4 py-3">Order</th>
                  <th className="text-left text-xs font-bold text-zinc-500 uppercase px-4 py-3">Product</th>
                  <th className="text-left text-xs font-bold text-zinc-500 uppercase px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-bold text-zinc-500 uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-bold text-zinc-500 uppercase px-4 py-3">Payment</th>
                  <th className="text-left text-xs font-bold text-zinc-500 uppercase px-4 py-3">
                    <button onClick={() => toggleSort("total")} className="flex items-center gap-1">
                      Total <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left text-xs font-bold text-zinc-500 uppercase px-4 py-3">
                    <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1">
                      Date <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-right text-xs font-bold text-zinc-500 uppercase px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orders.map((order) => {
                  const firstItem = order.items?.[0];
                  const hasMultipleItems = (order.items?.length || 0) > 1;
                  
                  return (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={bulkSelected.has(order.id)} 
                          onChange={() => toggleBulk(order.id)} className="accent-orange-500" />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-mono text-orange-400 text-sm">{order.order_number}</p>
                        <p className="text-xs text-zinc-600">{ago(order.created_at)}</p>
                      </td>
                      <td className="px-4 py-4">
                        {firstItem ? (
                          <div className="flex items-center gap-3 min-w-0">
                            <ItemImage item={firstItem} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-white text-sm truncate max-w-[160px]">{firstItem.product_name}</p>
                              {hasMultipleItems && (
                                <p className="text-xs text-zinc-500">+{order.items!.length - 1} more</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-zinc-600" />
                            </div>
                            <p className="text-sm text-zinc-500">No items</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white truncate max-w-[140px]">{order.shipping_address?.full_name || "—"}</p>
                        <p className="text-xs text-zinc-500 truncate max-w-[140px]">{order.shipping_address?.email || order.shipping_address?.city || ""}</p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <PaymentBadge status={order.payment_status} />
                          {order.payment_status !== "paid" && (
                            <button onClick={() => updatePayment(order.id, "paid")}
                              className="text-emerald-400 hover:bg-emerald-500/10 p-1 rounded-lg transition-colors"
                              title="Mark as paid">
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-white">{fmt(order.total || 0)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-zinc-300">{dt(order.created_at)}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => {
                            const phone = order.shipping_address?.phone;
                            if (phone) {
                              const digits = cleanPhoneForWhatsApp(phone);
                              if (digits) {
                                window.open(`https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${order.shipping_address?.full_name || ""}! Your order ${order.order_number} is ${STATUS_CONFIG[order.status]?.label}. Total: ${fmt(order.total)}`)}`, "_blank");
                              }
                            }
                          }} className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button onClick={() => setSelectedOrder(order)} className="p-2 hover:bg-orange-500/10 rounded-lg">
                            <Eye className="w-4 h-4 text-zinc-400 hover:text-orange-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg disabled:opacity-50 hover:bg-zinc-800">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg disabled:opacity-50 hover:bg-zinc-800">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDrawer
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onStatusChange={updateStatus}
            onPaymentChange={updatePayment}
            adminAvailability={availability}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <ToastNotif message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default AdminOrders;