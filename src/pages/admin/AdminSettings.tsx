// ============================================
// HOTSHOT FABRICS - ADMIN SETTINGS
// Production Ready | Real-time Store Configuration
// ============================================
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, supabase } from "../../AppContext";
import {
  Save, Settings, Store, CreditCard, Truck, Bell,
  RefreshCw, CheckCircle, Globe, Shield, Palette,
  Mail, Phone, MapPin, DollarSign, Percent, TruckIcon,
  Wifi, WifiOff
} from "lucide-react";

// ---------- Types ----------
interface SettingGroup {
  icon: any;
  title: string;
  description: string;
  settings: SettingField[];
}

interface SettingField {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "checkbox" | "textarea" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  helpText?: string;
}

// ---------- Settings Configuration ----------
const settingGroups: SettingGroup[] = [
  {
    icon: Store,
    title: "Store Information",
    description: "Basic store details and contact information",
    settings: [
      { key: "store_name", label: "Store Name", type: "text", placeholder: "Hotshot Fabrics" },
      { key: "store_email", label: "Store Email", type: "email", placeholder: "info@hotshotfabrics.co.za" },
      { key: "store_phone", label: "Store Phone", type: "tel", placeholder: "+27 83 416 0993" },
      { key: "store_address", label: "Store Address", type: "textarea", placeholder: "123 Main Street, Johannesburg" },
      { key: "whatsapp_number", label: "WhatsApp Number", type: "tel", placeholder: "0834160993", helpText: "Used for order & proof-of-payment notifications" },
    ]
  },
  {
    icon: CreditCard,
    title: "Banking Details",
    description: "EFT bank account details shown to customers at checkout",
    settings: [
      { key: "bank_name", label: "Bank Name", type: "text", placeholder: "First National Bank" },
      { key: "bank_account_name", label: "Account Holder Name", type: "text", placeholder: "Hotshot Fabrics" },
      { key: "bank_account", label: "Account Number", type: "text", placeholder: "6212345678" },
      { key: "bank_branch", label: "Branch Code", type: "text", placeholder: "250655" },
    ]
  },
  {
    icon: DollarSign,
    title: "Payment & Pricing",
    description: "Currency, tax, and payment settings",
    settings: [
      { key: "currency", label: "Currency", type: "select", options: [{ value: "ZAR", label: "South African Rand (R)" }, { value: "USD", label: "US Dollar ($)" }] },
      { key: "currency_symbol", label: "Currency Symbol", type: "text", placeholder: "R" },
      { key: "tax_rate", label: "Tax Rate (%)", type: "number", placeholder: "15" },
      { key: "shipping_cost", label: "Standard Shipping Cost", type: "number", placeholder: "80" },
      { key: "free_shipping_threshold", label: "Free Shipping Threshold", type: "number", placeholder: "1500", helpText: "Orders above this amount get free shipping" },
      { key: "cod_enabled", label: "Cash on Delivery", type: "checkbox", helpText: "Allow customers to pay on delivery" },
    ]
  },
  {
    icon: TruckIcon,
    title: "Shipping & Delivery",
    description: "Delivery options and courier settings",
    settings: [
      { key: "delivery_days_standard", label: "Standard Delivery (days)", type: "number", placeholder: "3-5" },
      { key: "delivery_days_express", label: "Express Delivery (days)", type: "number", placeholder: "1-2" },
      { key: "express_shipping_cost", label: "Express Shipping Cost", type: "number", placeholder: "150" },
      { key: "default_courier", label: "Default Courier", type: "text", placeholder: "The Courier Guy" },
    ]
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Email and WhatsApp notification settings",
    settings: [
      { key: "whatsapp_enabled", label: "WhatsApp Notifications", type: "checkbox", helpText: "Send order updates via WhatsApp" },
      { key: "email_notifications", label: "Email Notifications", type: "checkbox", helpText: "Send order confirmations via email" },
      { key: "admin_email", label: "Admin Notification Email", type: "email", placeholder: "admin@hotshotfabrics.co.za" },
      { key: "order_confirmation_template", label: "Order Confirmation Template", type: "textarea", placeholder: "Thank you for your order..." },
    ]
  },
  {
    icon: Shield,
    title: "Store Policies",
    description: "Terms, privacy, and return policies",
    settings: [
      { key: "return_policy_days", label: "Return Policy (days)", type: "number", placeholder: "7" },
      { key: "exchange_policy_days", label: "Exchange Policy (days)", type: "number", placeholder: "14" },
      { key: "maintenance_mode", label: "Maintenance Mode", type: "checkbox", helpText: "Show maintenance page to visitors" },
    ]
  }
];

// ---------- Main Component ----------
export function AdminSettings() {
  const { toast } = useApp();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeGroup, setActiveGroup] = useState("store");
  const [hasChanges, setHasChanges] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Refs to avoid stale closures in callbacks
  const realtimeRef = useRef<any>(null);
  const fetchSettingsRef = useRef<() => Promise<void>>();

  // ---------- Fetch settings from DB ----------
  const fetchSettings = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await supabase.from("store_settings").select("*");
      if (error) throw error;

      const map: Record<string, string> = {};
      data?.forEach((s: any) => (map[s.key] = s.value));
      setSettings(map);
    } catch (err: any) {
      toast(`Failed to load settings: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Keep a stable ref for the realtime callback
  useEffect(() => {
    fetchSettingsRef.current = fetchSettings;
  }, [fetchSettings]);

  // ---------- Initial load ----------
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ---------- Real-time subscription (pro) ----------
  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>; // ✅ FIXED: was NodeJS.Timeout
    let retries = 0;
    const MAX_RETRIES = 5;

    const subscribe = () => {
      const channel = supabase
        .channel("admin-settings-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "store_settings" },
          () => {
            // Fetch latest settings silently
            fetchSettingsRef.current?.();
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setRealtimeConnected(true);
            retries = 0; // reset on success
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            setRealtimeConnected(false);
            // Exponential backoff retry
            if (retries < MAX_RETRIES) {
              const delay = Math.min(1000 * 2 ** retries, 30000);
              retryTimeout = setTimeout(() => {
                retries++;
                subscribe();
              }, delay);
            }
          }
        });

      realtimeRef.current = channel;
    };

    subscribe();

    return () => {
      clearTimeout(retryTimeout);
      realtimeRef.current?.unsubscribe();
      realtimeRef.current = null;
    };
  }, []); // Run only once on mount

  // ---------- Refresh handler ----------
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSettings();
    setIsRefreshing(false);
    toast("Settings refreshed", "success");
  };

  // ---------- Save handler (single batch upsert) ----------
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));

      const { error } = await supabase
        .from("store_settings")
        .upsert(updates, { onConflict: "key" });

      if (error) throw error;

      setHasChanges(false);
      toast("Settings saved successfully", "success");
    } catch (err: any) {
      toast(`Error saving settings: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Update local state ----------
  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const currentGroup =
    settingGroups.find(
      (g) => g.title.toLowerCase().replace(/\s+/g, "-") === activeGroup
    ) || settingGroups[0];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black">Settings</h1>
            {hasChanges && (
              <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs font-bold rounded-lg border border-orange-500/20">
                Unsaved Changes
              </span>
            )}
            {/* Real-time status indicator */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
                realtimeConnected
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
            >
              {realtimeConnected ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {realtimeConnected ? "Live" : "Offline"}
            </span>
          </div>
          <p className="text-zinc-400 mt-1">Configure your store preferences</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-all disabled:opacity-50"
            title="Refresh settings"
          >
            <RefreshCw className={`w-5 h-5 text-zinc-400 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {settingGroups.map((group) => (
            <button
              key={group.title}
              onClick={() =>
                setActiveGroup(group.title.toLowerCase().replace(/\s+/g, "-"))
              }
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                activeGroup === group.title.toLowerCase().replace(/\s+/g, "-")
                  ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                  : "bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              <group.icon className="w-5 h-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{group.title}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeGroup}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6"
          >
            <div className="mb-6">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <currentGroup.icon className="w-5 h-5 text-orange-500" />{" "}
                {currentGroup.title}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">{currentGroup.description}</p>
            </div>

            <div className="space-y-5">
              {currentGroup.settings.map((setting) => (
                <div key={setting.key} className="group">
                  <label className="text-sm font-medium text-zinc-300 mb-2 flex items-center justify-between">
                    {setting.label}
                    {setting.helpText && (
                      <span className="text-xs text-zinc-500 font-normal ml-2">
                        {setting.helpText}
                      </span>
                    )}
                  </label>
                  {setting.type === "checkbox" ? (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          settings[setting.key] === "true"
                            ? "border-orange-500 bg-orange-500"
                            : "border-zinc-700 group-hover:border-zinc-500"
                        }`}
                      >
                        {settings[setting.key] === "true" && (
                          <CheckCircle className="w-3.5 h-3.5 text-black" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={settings[setting.key] === "true"}
                        onChange={(e) =>
                          updateSetting(setting.key, e.target.checked ? "true" : "false")
                        }
                        className="hidden"
                      />
                      <span className="text-sm text-zinc-400">Enabled</span>
                    </label>
                  ) : setting.type === "textarea" ? (
                    <textarea
                      value={settings[setting.key] || ""}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      placeholder={setting.placeholder}
                      rows={3}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 resize-none transition-all text-sm"
                    />
                  ) : setting.type === "select" ? (
                    <select
                      value={settings[setting.key] || ""}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-all text-sm"
                    >
                      <option value="">Select {setting.label}</option>
                      {setting.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={setting.type}
                      value={settings[setting.key] || ""}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      placeholder={setting.placeholder}
                      className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}