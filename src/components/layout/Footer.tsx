// ============================================
// HOTSHOT FABRICS - FOOTER
// Production Ready | Enhanced
// ============================================
import { motion } from "framer-motion";
import { useApp } from "../../AppContext";
import {
  Instagram, Facebook, Twitter, Mail, Phone, MapPin,
  ArrowUpRight, Heart
} from "lucide-react";

export function Footer() {
  const { setCurrentView } = useApp();

  const footerLinks: Record<string, { label: string; view: any; params?: Record<string, string> }[]> = {
    shop: [
      { label: "All Products", view: "shop" },
      { label: "New Arrivals", view: "shop", params: { filter: "new" } },
      { label: "Best Sellers", view: "shop", params: { filter: "bestseller" } },
      { label: "Sale", view: "shop", params: { filter: "sale" } },
    ],
    support: [
      { label: "Contact Us", view: "contact" as const },
      { label: "Shipping Info", view: "shipping" as const },
      { label: "Returns", view: "returns" as const },
      { label: "Size Guide", view: "size-guide" as const },
      { label: "FAQ", view: "faq" as const },
    ],
    legal: [
      { label: "Privacy Policy", view: "privacy" as const },
      { label: "Terms of Service", view: "terms" as const },
    ],
  };

  return (
    <footer className="bg-zinc-950 border-t border-zinc-900">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-lg">HF</span>
              </div>
              <span className="font-black text-xl">HOTSHOT FABRICS</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-sm">
              Premium South African fashion. Quality fabrics, bold designs, 
              and unmatched style delivered to your doorstep.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Instagram, href: "https://www.instagram.com/hotshot_fabrics_15?igsh=b2FzYXVtaTN0N2Ri", label: "Instagram" },
                { icon: Facebook, href: "https://www.facebook.com/Hotshot.04", label: "Facebook" },
                { icon: Twitter, href: "https://www.tiktok.com/@hotshot.fabrics?_r=1&_t=ZS-976SMf8IWTx", label: "TikTok" },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 bg-zinc-900 hover:bg-orange-500 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => setCurrentView(link.view, link.params)}
                    className="text-zinc-400 hover:text-orange-400 text-sm transition-colors flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => setCurrentView(link.view)}
                    className="text-zinc-400 hover:text-orange-400 text-sm transition-colors flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href="tel:0834160993" className="text-zinc-400 hover:text-orange-400 text-sm transition-colors flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-500" />
                  083 416 0993
                </a>
              </li>
              <li>
                <a href="mailto:Hotshotfabrics15@gmail.com" className="text-zinc-400 hover:text-orange-400 text-sm transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-500" />
                  Hotshotfabrics15@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-zinc-400 text-sm">
                <MapPin className="w-4 h-4 text-orange-500" />
                Johannesburg, South Africa
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-900 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 text-sm flex items-center gap-1">
            © {new Date().getFullYear()} Hotshot Fabrics. Made with <Heart className="w-3 h-3 text-red-500 fill-current" /> in SA
          </p>
          <div className="flex gap-6">
            {footerLinks.legal.map((link) => (
              <button
                key={link.label}
                onClick={() => setCurrentView(link.view)}
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}