"use client";

import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

export function Pricing() {
  const t = useTranslations("Pricing");

  // Get checkout URL - NEXT_PUBLIC_ vars are embedded at build time
  const checkoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL || "#";

  // Debug: Log to console (remove in production)
  if (typeof window !== "undefined") {
    console.log("Checkout URL:", checkoutUrl);
  }

  return (
    <section className="py-20 px-6 max-w-7xl mx-auto" id="pricing">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">{t("title")}</h2>
        <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
      </div>

      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-b from-primary/5 to-background border border-primary/20 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl shadow-primary/5"
        >
          {/* Badge */}
          <div className="absolute top-0 right-0 bg-primary text-black text-xs font-bold px-4 py-1.5 rounded-bl-xl">
            {t("badge")}
          </div>

          <div className="flex items-baseline gap-2 mb-2 mt-4">
            <span className="text-6xl font-bold tracking-tight text-white">
              {t("price")}
            </span>
            <span className="text-2xl font-semibold text-white/70">
              {t("price_period")}
            </span>
            <span className="text-muted-foreground line-through text-xl ml-2">
              {t("old_price")}
            </span>
          </div>

          <p className="text-muted-foreground mb-8 text-sm">{t("desc")}</p>

          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-4 bg-primary hover:bg-cyan-400 text-black rounded-xl font-bold text-lg transition-all shadow-[0_0_30px_-10px_rgba(0,243,255,0.4)] mb-8 hover:scale-[1.02] active:scale-[0.98]"
          >
            {t("cta")}
          </a>

          <ul className="space-y-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <li key={num} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm font-medium">{t(`f${num}`)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>{t("money_back")}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
