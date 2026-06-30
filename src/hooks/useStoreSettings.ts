import { useState, useEffect } from "react";
import { supabase } from "../AppContext";

export interface StoreSettings {
  whatsapp_number: string;
  store_email: string;
  store_name: string;
  shipping_threshold: number;
  standard_shipping_cost: number;
  express_shipping_cost: number;
  loyalty_point_value: number;
  loyalty_earn_rate: number;
  referral_bonus_points: number;
  referral_bonus_value: number;
  bank_name: string;
  bank_account: string;
  bank_branch: string;
  bank_account_name: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  whatsapp_number: "0834160993",
  store_email: "info@hotshotfabrics.co.za",
  store_name: "Hotshot Fabrics",
  shipping_threshold: 1500,
  standard_shipping_cost: 80,
  express_shipping_cost: 150,
  loyalty_point_value: 0.01,
  loyalty_earn_rate: 0.1,
  referral_bonus_points: 10,
  referral_bonus_value: 0.10,
  bank_name: "First National Bank",
  bank_account: "6212345678",
  bank_branch: "250655",
  bank_account_name: "Hotshot Fabrics",
};

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("store_settings").select("*");
      if (data) {
        const map = data.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {} as any);
        setSettings({ ...DEFAULT_SETTINGS, ...map });
      }
      setLoading(false);
    };
    fetchSettings();
    
    const channel = supabase
      .channel("store_settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings" }, fetchSettings)
      .subscribe();
      
    return () => { channel.unsubscribe(); };
  }, []);

  return { settings, loading };
}