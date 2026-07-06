import { AnimatePresence, motion } from "framer-motion";
import { Hand } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { springSnappy, willChangeTransform } from "@/lib/motion";

/* ------------------------------------------------------------------ */
/*  GlobeHint — pulsing "Tap to interact" glass pill                    */
/*  Shown over the globe until the user first interacts with it.        */
/* ------------------------------------------------------------------ */

export default function GlobeHint({ visible }: { visible: boolean }) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9, transition: { duration: 0.25 } }}
          transition={{ ...springSnappy, delay: 0.6 }}
          style={willChangeTransform}
          className="pointer-events-none absolute bottom-[18%] left-1/2 z-20 -translate-x-1/2"
        >
          <div className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 shadow-xl">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-5 w-5 items-center justify-center text-primary"
            >
              <Hand className="h-4 w-4" strokeWidth={2.2} />
            </motion.span>
            <span className="text-xs font-semibold text-foreground/80">
              {t("hero.hint", "Tap to interact")}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
