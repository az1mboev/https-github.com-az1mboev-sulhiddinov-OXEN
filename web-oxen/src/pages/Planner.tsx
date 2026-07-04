import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Send, Sun, Sunset, Moon, Wallet, Lightbulb, Bookmark, Check } from "lucide-react";
import { useState } from "react";

import { useTravel } from "@/contexts/TravelContext";
import { generateItinerary, type Itinerary } from "@/lib/ai";
import { useToast } from "@/hooks/use-toast";

const SUGGESTIONS = [
  "5 relaxing days in Kyoto for a couple, mid budget",
  "A week of adventure in Iceland on a budget",
  "Romantic long weekend in Venice",
  "10-day food tour through Thailand",
];

export default function Planner() {
  const { toast } = useToast();
  const { saveItinerary } = useTravel();
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const [lastPrompt, setLastPrompt] = useState<string>("");

  const run = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setItinerary(null);
    setSaved(false);
    setLastPrompt(text);
    try {
      const result = await generateItinerary(text);
      setItinerary(result);
    } catch (err) {
      toast({
        title: "The planner stumbled",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!itinerary) return;
    saveItinerary(lastPrompt, itinerary);
    setSaved(true);
    toast({ title: "Itinerary saved", description: "Find it on your dashboard." });
  };

  return (
    <div className="relative px-5 pt-7">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-widest">AI Travel Planner</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">
          Describe your <span className="text-gold-gradient">dream trip.</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tell OXEN where, how long, and your vibe — get a full itinerary in seconds.
        </p>
      </motion.div>

      {/* Input */}
      <div className="mt-5">
        <div className="glass-strong rounded-2xl p-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. 6 days in Morocco, food and culture, mid budget for two…"
            rows={3}
            className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex justify-end">
            <button
              onClick={() => run(prompt)}
              disabled={loading || !prompt.trim()}
              className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Planning…" : "Generate"}
            </button>
          </div>
        </div>

        {!itinerary && !loading && (
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setPrompt(s);
                  run(s);
                }}
                className="rounded-full border border-border bg-card/40 px-3.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-7 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass relative overflow-hidden rounded-2xl p-5">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="mt-3 h-3 w-full rounded bg-muted/60" />
              <div className="mt-2 h-3 w-2/3 rounded bg-muted/60" />
              <div
                className="absolute inset-0 -translate-x-full"
                style={{
                  background: "linear-gradient(90deg, transparent, hsl(40 60% 60% / 0.08), transparent)",
                  animation: "shimmer 1.6s infinite",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {itinerary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-7 space-y-5"
          >
            {/* Overview */}
            <div className="glass-strong rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-extrabold">{itinerary.destination}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{itinerary.summary}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    saved ? "bg-primary/15 text-primary" : "gold-gradient text-primary-foreground hover:scale-105"
                  }`}
                >
                  {saved ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {saved ? "Saved" : "Save"}
                </button>
              </div>
              {itinerary.bestTime && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sun className="h-3.5 w-3.5" /> Best time: {itinerary.bestTime}
                </div>
              )}
            </div>

            {/* Daily plan */}
            <div>
              <h3 className="mb-3 font-display text-lg font-bold">Day by day</h3>
              <div className="space-y-3">
                {itinerary.days.map((day, i) => (
                  <motion.div
                    key={day.day}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass rounded-2xl p-4"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="gold-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
                        {day.day}
                      </span>
                      <span className="font-display font-bold">{day.title}</span>
                    </div>
                    <div className="space-y-2.5 pl-1">
                      <Slot icon={Sun} label="Morning" text={day.morning} />
                      <Slot icon={Sunset} label="Afternoon" text={day.afternoon} />
                      <Slot icon={Moon} label="Evening" text={day.evening} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Budget */}
            {itinerary.budget.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                  <Wallet className="h-5 w-5 text-primary" /> Budget breakdown
                </h3>
                <div className="glass overflow-hidden rounded-2xl">
                  {itinerary.budget.map((b, i) => (
                    <div
                      key={b.category}
                      className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? "border-t border-border/50" : ""}`}
                    >
                      <span className="text-sm text-muted-foreground">{b.category}</span>
                      <span className="text-sm font-bold">{b.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {itinerary.tips.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                  <Lightbulb className="h-5 w-5 text-primary" /> Insider tips
                </h3>
                <div className="space-y-2">
                  {itinerary.tips.map((t, i) => (
                    <div key={i} className="glass flex items-start gap-3 rounded-xl p-3.5">
                      <span className="mt-0.5 text-primary">✦</span>
                      <span className="text-sm leading-relaxed text-muted-foreground">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Slot({ icon: Icon, label, text }: { icon: typeof Sun; label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
      <div>
        <span className="text-xs font-semibold text-foreground">{label}: </span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}
