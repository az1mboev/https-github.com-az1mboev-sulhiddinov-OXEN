import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Globe } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { LANGUAGES, useLanguage } from "@/contexts/LanguageContext";
import { springSnappy, willChangeTransform } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LanguagePicker = lazy(() => import("@/components/LanguagePicker"));

/* ------------------------------------------------------------------ */
/*  LanguageSwitcher — compact glass pill for the top nav bar           */
/*  Tapping opens a searchable dropdown of all 20 languages.            */
/* ------------------------------------------------------------------ */

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        transition={springSnappy}
        onClick={() => setOpen((p) => !p)}
        className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:text-foreground"
        aria-label="Switch language"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="uppercase tracking-wide">{current.code}</span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          strokeWidth={2.5}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={springSnappy}
            style={willChangeTransform}
            className="glass-strong absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl p-3 shadow-2xl"
          >
            <Suspense
              fallback={
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                  Loading…
                </div>
              }
            >
              <LanguagePicker
                compact
                onSelect={(code) => {
                  setLanguage(code);
                  setOpen(false);
                }}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
