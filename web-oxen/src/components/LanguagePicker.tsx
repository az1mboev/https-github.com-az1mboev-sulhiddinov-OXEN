import { motion } from "framer-motion";
import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { LANGUAGES, type Language, type LanguageMeta, useLanguage } from "@/contexts/LanguageContext";
import { springSnappy, staggerContainer, fadeUpChild } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  LanguagePicker — reusable language selection list                    */
/*  Used by: Onboarding, top-nav LanguageSwitcher, Settings > Language  */
/* ------------------------------------------------------------------ */

interface LanguagePickerProps {
  /** Currently selected language code. Falls back to context value. */
  selected?: Language;
  /** Called when a language is tapped. Falls back to context setLanguage. */
  onSelect?: (lang: Language, meta: LanguageMeta) => void;
  /** Show the search field at the top. Default true. */
  searchable?: boolean;
  /** Compact mode — smaller rows, no search. */
  compact?: boolean;
  className?: string;
}

export default function LanguagePicker({
  selected,
  onSelect,
  searchable = true,
  compact = false,
  className,
}: LanguagePickerProps) {
  const { language, setLanguage } = useLanguage();
  const current = selected ?? language;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return LANGUAGES;
    const q = query.toLowerCase();
    return LANGUAGES.filter(
      (l) =>
        l.code.includes(q) ||
        l.label.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = (meta: LanguageMeta) => {
    setLanguage(meta.code);
    onSelect?.(meta.code, meta);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {searchable && (
        <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 mb-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search language…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
        </div>
      )}

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={cn(
          "max-h-[360px] overflow-y-auto no-scrollbar rounded-2xl",
          compact ? "gap-0" : "gap-1",
        )}
      >
        {filtered.map((meta) => {
          const isActive = current === meta.code;
          return (
            <motion.button
              key={meta.code}
              variants={fadeUpChild}
              onClick={() => handleSelect(meta)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 text-left transition",
                compact ? "py-2" : "py-3",
                isActive
                  ? "bg-primary/12 text-foreground"
                  : "hover:bg-white/[0.04] dark:hover:bg-white/[0.04]",
              )}
            >
              <span className={cn("shrink-0 text-xl", compact ? "text-lg" : "text-2xl")}>
                {meta.flag}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{meta.native}</p>
                <p className="truncate text-xs text-muted-foreground">{meta.label}</p>
              </div>
              {isActive && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springSnappy}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </motion.span>
              )}
            </motion.button>
          );
        })}

        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No languages found</p>
        )}
      </motion.div>
    </div>
  );
}
