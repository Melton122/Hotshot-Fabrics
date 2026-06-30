import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ArrowRight, Mail, Phone, MapPin, Truck, Repeat, ShieldCheck } from "lucide-react";

const pageWrapper = "min-h-screen bg-black text-white px-4 sm:px-6 lg:px-8 py-20";
const sectionBase = "bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl shadow-black/40";
const sectionTitle = "text-3xl md:text-4xl font-black tracking-tight text-white mb-4";
const sectionText = "text-zinc-400 leading-8 max-w-4xl";
const cardBase = "rounded-[2rem] border border-zinc-800 bg-zinc-900 p-6 text-zinc-300 shadow-xl shadow-black/20";

function PageHeader({ title, tagline }: { title: string; tagline: string; }) {
  return (
    <div className="max-w-4xl mx-auto text-center mb-12">
      <motion.h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {title}
      </motion.h1>
      <motion.p className="text-zinc-400 text-lg sm:text-xl leading-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {tagline}
      </motion.p>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode; }) {
  return (
    <section className="mb-10 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      <div className={sectionBase}>{children}</div>
    </section>
  );
}

function InfoCard({ icon: Icon, title, description }: { icon: typeof ArrowRight; title: string; description: string; }) {
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-3 mb-4 text-orange-400">
        <Icon className="w-6 h-6" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <p className="text-zinc-400 leading-7">{description}</p>
    </div>
  );
}

export function ContactUsPage() {
  return (
    <div className={pageWrapper}>
      <PageHeader
        title="Contact Us"
        tagline="Need help choosing fabric, placing an order, or tracking delivery? Our team is ready to support you every step of the way."
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_380px] items-start">
        <div>
          <InfoSection title="Speak to the Hotshot team">
            <p className={sectionText}>
              Our customer care team is available for styling advice, custom orders, and shipping updates.
              Whether you need fabric recommendations for a project or want to confirm your delivery window,
              we deliver fast, friendly support.
            </p>
          </InfoSection>

          <InfoSection title="Send us a message">
            <form className="grid gap-5">
              <div className="grid gap-3">
                <label className="text-sm font-semibold text-white">Email</label>
                <input type="email" placeholder="you@example.com" className="w-full rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-orange-500" />
              </div>
              <div className="grid gap-3">
                <label className="text-sm font-semibold text-white">Subject</label>
                <input type="text" placeholder="Order enquiry, shipping, returns" className="w-full rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-orange-500" />
              </div>
              <div className="grid gap-3">
                <label className="text-sm font-semibold text-white">Message</label>
                <textarea rows={6} placeholder="Tell us how we can help" className="w-full rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-orange-500 resize-none" />
              </div>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black shadow-xl shadow-orange-500/20 transition-colors hover:bg-orange-400">
                Send message
              </button>
            </form>
          </InfoSection>
        </div>

        <aside className="space-y-6">
          <div className={cardBase}>
            <div className="flex items-center gap-3 text-orange-400 mb-4">
              <Mail className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em] font-semibold text-orange-300">Email</span>
            </div>
            <p className="text-white font-semibold">orders@hotshotfabrics.co.za</p>
          </div>
          <div className={cardBase}>
            <div className="flex items-center gap-3 text-orange-400 mb-4">
              <Phone className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em] font-semibold text-orange-300">Phone</span>
            </div>
            <p className="text-white font-semibold">083 416 0993</p>
            <p className="text-zinc-400 text-sm mt-2">Mon - Fri: 9AM - 6PM</p>
          </div>
          <div className={cardBase}>
            <div className="flex items-center gap-3 text-orange-400 mb-4">
              <MapPin className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em] font-semibold text-orange-300">Location</span>
            </div>
            <p className="text-white font-semibold">Johannesburg, South Africa</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ShippingInfoPage() {
  return (
    <div className={pageWrapper}>
      <PageHeader
        title="Shipping Info"
        tagline="Transparent delivery terms built for your convenience — from order confirmation to doorstep arrival." 
      />
      <div className="grid gap-10">
        <InfoSection title="Fast delivery across South Africa">
          <p className={sectionText}>
            Orders over R1,500 qualify for free shipping. Standard shipping is carefully handled with trusted local couriers to ensure your fabric arrives safely and on time.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <InfoCard icon={Truck} title="Shipping windows" description="Most orders ship within 1–2 business days. Delivery times vary by location, typically 3–5 business days." />
            <InfoCard icon={ShieldCheck} title="Damaged item support" description="If your parcel is damaged in transit, contact us immediately and we’ll arrange a replacement or refund." />
          </div>
        </InfoSection>

        <InfoSection title="Track your delivery">
          <p className={sectionText}>
            Once your order ships, we send tracking details straight to your inbox. You can also get updates via WhatsApp for real-time delivery status.
          </p>
        </InfoSection>

        <InfoSection title="Delivery terms">
          <ul className="grid gap-4 text-zinc-400 leading-8 list-disc list-inside">
            <li><span className="text-white font-semibold">No cash on delivery.</span> All orders must be paid in full before dispatch. We accept card, EFT, and instant EFT.</li>
            <li><span className="text-white font-semibold">Hand-to-hand delivery</span> is available for customers within 10 km of our location in Johannesburg — this option will appear at checkout if you qualify.</li>
          </ul>
        </InfoSection>

        <InfoSection title="Delivery guidance">
          <ul className="grid gap-4 text-zinc-400 leading-8 list-disc list-inside">
            <li>Order by midday for faster same-week shipping.</li>
            <li>Check that your delivery address is complete and accurate before confirming checkout.</li>
            <li>If you miss your delivery, the courier will usually attempt redelivery or hold your parcel at a nearby collection point.</li>
          </ul>
        </InfoSection>
      </div>
    </div>
  );
}

export function ReturnsExchangesPage() {
  return (
    <div className={pageWrapper}>
      <PageHeader
        title="Returns & Exchanges"
        tagline="Our exchange window is short, so act fast. No refunds — all sales are final. Exchanges must be requested within 12 hours of placing your order." 
      />
      <div className="grid gap-10">
        <InfoSection title="Our return policy">
          <p className={sectionText}>
            We do not offer refunds. All sales are final once an order has been placed and paid. Please review your order carefully before confirming checkout.
          </p>
        </InfoSection>

        <InfoSection title="Exchange policy">
          <p className={sectionText}>
            Exchanges are accepted within <span className="text-white font-semibold">12 hours of placing your order</span>. After this window has passed, we are unable to process any exchange requests. To request an exchange, contact our support team immediately with your order details.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <InfoCard icon={Repeat} title="Size or colour exchange" description="If you need a different fabric or width, we handle exchanges quickly and transparently." />
            <InfoCard icon={ShieldCheck} title="Quality guarantee" description="If an item arrives damaged or defective, contact us immediately and we’ll arrange a replacement at no extra cost." />
          </div>
        </InfoSection>

        <InfoSection title="How to request an exchange">
          <ol className="grid gap-4 text-zinc-400 leading-8 list-decimal list-inside">
            <li>Contact our support team within 12 hours of placing your order.</li>
            <li>Provide your order number and the item you'd like to exchange.</li>
            <li>Our team will confirm the exchange and guide you through the next steps.</li>
          </ol>
        </InfoSection>
      </div>
    </div>
  );
}

export function SizeGuidePage() {
  return (
    <div className={pageWrapper}>
      <PageHeader
        title="Size Guide"
        tagline="Find the perfect fit with clear measurements for fabrics, garments, and sewing projects." 
      />
      <div className="grid gap-10">
        <InfoSection title="Standard dimensions">
          <p className={sectionText}>
            Our fabrics are sold by the meter, and garment measurements are designed to help you choose the best option for your project.
          </p>
          <div className="overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 mt-8">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-900 text-zinc-300">
                <tr>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Width</th>
                  <th className="px-6 py-4">Length</th>
                  <th className="px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { item: "Cotton & linen", width: "140 cm", length: "Sold by meter", notes: "Perfect for dresses, shirts and home decor." },
                  { item: "Silk & chiffon", width: "110 cm", length: "Sold by meter", notes: "Lightweight flow for drapes and evening wear." },
                  { item: "Canvas & denim", width: "150 cm", length: "Sold by meter", notes: "Ideal for jackets, bags and upholstery." },
                ].map((row) => (
                  <tr key={row.item} className="border-t border-zinc-800 hover:bg-zinc-900 transition-colors">
                    <td className="px-6 py-4 text-white">{row.item}</td>
                    <td className="px-6 py-4">{row.width}</td>
                    <td className="px-6 py-4">{row.length}</td>
                    <td className="px-6 py-4 text-zinc-400">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InfoSection>

        <InfoSection title="Sizing tips">
          <ul className="grid gap-4 text-zinc-400 leading-8 list-disc list-inside">
            <li>Measure twice before cutting — most fabrics cannot be returned once cut.</li>
            <li>Allow 10–15 cm extra for hems and seams when planning sewing projects.</li>
            <li>Match fabric choice to your project: choose heavier weights for jackets and lighter weights for blouses.</li>
          </ul>
        </InfoSection>
      </div>
    </div>
  );
}

export function FaqPage() {
  return (
    <div className={pageWrapper}>
      <PageHeader
        title="Frequently Asked Questions"
        tagline="Quick answers to the most common questions about orders, delivery, returns, and fabric care." 
      />
      <div className="grid gap-6 max-w-4xl mx-auto">
        {[
          { question: "How long does shipping take?", answer: "Standard delivery within South Africa usually takes 3–5 business days after dispatch. Orders over R1,500 qualify for free shipping." },
          { question: "Can I return or exchange my order?", answer: "We do not offer refunds — all sales are final. Exchanges are only accepted within 12 hours of placing your order. Contact us immediately with your order number if you need to request one." },
          { question: "How do I track my order?", answer: "Tracking details are sent to your email once your order ships. You can also request a WhatsApp update for a live delivery status." },
          { question: "Do you offer gift wrapping?", answer: "Yes — please add a note at checkout or contact us directly and we’ll arrange premium packaging for your order." },
          { question: "What payment methods do you accept?", answer: "We accept all major credit cards, EFT, and instant EFT. We do not offer cash on delivery — full payment is required before your order is dispatched." },
        ].map((item) => (
          <motion.div key={item.question} className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8" initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h3 className="text-xl font-semibold text-white mb-3">{item.question}</h3>
            <p className="text-zinc-400 leading-8">{item.answer}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <div className={pageWrapper}>
      <PageHeader
        title="Privacy Policy"
        tagline="Your privacy is important. We keep your personal data safe and only use it to improve your shopping experience." 
      />
      <div className="grid gap-10 max-w-5xl mx-auto">
        <InfoSection title="What we collect">
          <ul className="grid gap-3 text-zinc-400 leading-8 list-disc list-inside">
            <li>Contact information like email and phone number for order updates.</li>
            <li>Shipping and billing addresses to deliver your orders accurately.</li>
            <li>Purchase history to improve recommendations and customer support.</li>
          </ul>
        </InfoSection>

        <InfoSection title="How we use your data">
          <p className={sectionText}>
            We use your information to process orders, send shipping notifications, and personalize your experience. We never sell your data to third parties.
          </p>
        </InfoSection>

        <InfoSection title="Your rights">
          <ul className="grid gap-3 text-zinc-400 leading-8 list-disc list-inside">
            <li>Request access to your personal information at any time.</li>
            <li>Ask us to correct inaccurate details.</li>
            <li>Ask for your account data to be deleted if you no longer want to shop with us.</li>
          </ul>
        </InfoSection>
      </div>
    </div>
  );
}

export function TermsOfServicePage() {
  return (
    <div className={pageWrapper}>
      <PageHeader
        title="Terms of Service"
        tagline="These terms explain how Hotshot Fabrics operates and how we support safe, reliable shopping for every customer." 
      />
      <div className="grid gap-10 max-w-5xl mx-auto">
        <InfoSection title="Ordering" >
          <p className={sectionText}>
            Orders are confirmed once payment is received. We reserve the right to cancel or modify orders if inventory changes or if there are errors in pricing or product details.
          </p>
        </InfoSection>

        <InfoSection title="Payment & fulfillment">
          <p className={sectionText}>
            We accept cash, EFT, and instant EFT. Cash on delivery is not available — payment must be completed in full before an order is dispatched. Fulfillment begins after payment confirmation, and delivery times depend on your chosen shipping method.
          </p>
        </InfoSection>

        <InfoSection title="Returns & liability">
          <p className={sectionText}>
            All sales are final — we do not offer refunds. Order exchanges may be requested within 12 hours of placing an order; requests after this window cannot be accommodated. Hotshot Fabrics is not liable for delays caused by courier partners or customs inspections.
          </p>
        </InfoSection>
      </div>
    </div>
  );
}