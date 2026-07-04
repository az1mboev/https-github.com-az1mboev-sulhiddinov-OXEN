import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import {
  X, UserPen, Camera, AtSign, FileText, Mail, Phone, Lock,
  ShieldCheck, MonitorSmartphone, Activity, Fingerprint,
  Bell, BellRing, Globe2, Moon, Sun, Palette, Ruler, DollarSign,
  Clock, Trash2, Download, FileUp, HelpCircle, MessageCircle,
  AlertTriangle, Info, ChevronRight, Check, Languages, LogOut,
  Shield, MessageSquare, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, LANGUAGES, type Language } from "@/contexts/LanguageContext";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useChat } from "@/contexts/ChatContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const panelVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 32, mass: 0.9 },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { type: "spring" as const, stiffness: 350, damping: 34, mass: 0.9 },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};



function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h3 className="px-1 pt-6 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  destructive,
  trailing,
}: {
  icon: typeof UserPen;
  label: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-white/[0.04] active:scale-[0.98]",
        destructive && "text-destructive",
        !destructive && "text-foreground",
      )}
    >
      <span className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg",
        destructive ? "bg-destructive/10 text-destructive" : "bg-white/[0.06] text-muted-foreground",
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", destructive && "text-destructive")}>{label}</div>
        {value && <div className="text-xs text-muted-foreground truncate">{value}</div>}
      </div>
      {trailing ?? <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          value ? "bg-primary" : "bg-white/[0.12]",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  type Theme = "dark" | "light";
  const { totalUnread } = useChat();
  const { isOffline, forceOffline, setForceOffline, pendingSync, isOnline, sync, lastSyncedAt } = useOffline();

  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("km");
  const [currency, setCurrency] = useState<string>("USD");
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Privacy toggles
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showFollowers, setShowFollowers] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [travelAlerts, setTravelAlerts] = useState(true);
  const [aiRecs, setAiRecs] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Swipe right to close (mobile)
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    let startX = 0;
    const el = panelRef.current;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches[0].clientX - startX > 60) onClose();
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isOpen, onClose]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    onClose();
    toast({ title: "Signed out", description: "See you on the next adventure." });
    navigate("/");
  }, [signOut, onClose, toast, navigate]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="settings-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            style={{ willChange: "opacity" }}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            key="settings-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[360px] flex-col shadow-2xl"
            style={{ willChange: "transform, opacity" }}
          >
            {/* Glass bg */}
            <div className="absolute inset-0 rounded-l-[28px] bg-[hsl(225,42%,7%)]/[0.96] backdrop-blur-[40px] saturate-[1.8] border-l border-white/[0.06]" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold">Profile Settings</h2>
                <p className="text-xs text-muted-foreground">Customize your OXEN experience</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition-colors hover:bg-white/[0.12] hover:text-foreground active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar pb-8">
              {/* ── ACCOUNT ── */}
              <SectionHeader>Account</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={UserPen} label="Edit Profile" onClick={() => { onClose(); navigate("/profile/edit"); }} />
                <SettingsRow icon={MessageSquare} label="Messages" value={totalUnread > 0 ? `${totalUnread} unread` : "All caught up"} onClick={() => { onClose(); navigate("/messages"); }} />
                <SettingsRow icon={Shield} label="Admin Dashboard" onClick={() => { onClose(); navigate("/admin"); }} />
                <SettingsRow icon={AtSign} label="Username" value={`@${user.name.toLowerCase().replace(/\s+/g, "_")}`} />
                <SettingsRow icon={Mail} label="Email Address" value={user.email} />
              </div>

              {/* ── PRIVACY ── */}
              <SectionHeader>Privacy</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <ToggleRow icon={Lock} label="Private Account" value={privateAccount} onChange={setPrivateAccount} />
                <ToggleRow icon={Mail} label="Show Email" value={showEmail} onChange={setShowEmail} />
                <ToggleRow icon={Activity} label="Show Followers" value={showFollowers} onChange={setShowFollowers} />
                <SettingsRow icon={MessageCircle} label="Allow Messages" />
                <SettingsRow icon={ShieldCheck} label="Blocked Users" />
                <SettingsRow icon={ShieldCheck} label="Hidden Users" />
              </div>

              {/* ── SECURITY ── */}
              <SectionHeader>Security</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={Lock} label="Change Password" />
                <SettingsRow icon={ShieldCheck} label="Two-Factor Authentication" />
                <SettingsRow icon={MonitorSmartphone} label="Active Devices" />
                <SettingsRow icon={Activity} label="Login Activity" />
                <SettingsRow icon={Fingerprint} label="Face ID / Touch ID" />
              </div>

              {/* ── NOTIFICATIONS ── */}
              <SectionHeader>Notifications</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <ToggleRow icon={pushNotif ? BellRing : Bell} label="Push Notifications" value={pushNotif} onChange={setPushNotif} />
                <ToggleRow icon={Mail} label="Email Notifications" value={emailNotif} onChange={setEmailNotif} />
                <ToggleRow icon={Globe2} label="Travel Alerts" value={travelAlerts} onChange={setTravelAlerts} />
                <ToggleRow icon={Bell} label="AI Recommendations" value={aiRecs} onChange={setAiRecs} />
              </div>

              {/* ── LANGUAGE ── */}
              <SectionHeader>{t("profile.language", "Language")} · {LANGUAGES.length} languages</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04] max-h-[320px] overflow-y-auto no-scrollbar">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as Language);
                      toast({ title: `${lang.native} selected`, description: `Language changed to ${lang.label}` });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-lg">
                      {lang.flag}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium">{lang.native}</span>
                      <span className="block text-[11px] text-muted-foreground">{lang.label}</span>
                    </div>
                    {language === lang.code && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>

              {/* ── APPEARANCE ── */}
              <SectionHeader>Appearance</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                {([
                  { value: "dark" as Theme, label: "Dark Mode", icon: Moon },
                  { value: "light" as Theme, label: "Light Mode", icon: Sun },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      toast({ title: `${opt.label} enabled`, description: "Your theme preference has been saved." });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
                      <opt.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium">{opt.label}</span>
                    {theme === opt.value && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>

              {/* ── OFFLINE MODE ── */}
              <SectionHeader>Offline Mode</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <ToggleRow
                  icon={forceOffline ? WifiOff : Wifi}
                  label="Force Offline Mode"
                  value={forceOffline}
                  onChange={(v) => {
                    setForceOffline(v);
                    toast({ title: v ? "Offline mode enabled" : "Online mode restored", description: v ? "Changes will sync when you go online" : undefined });
                  }}
                />
                <SettingsRow
                  icon={isOnline && !forceOffline ? Wifi : WifiOff}
                  label="Connection Status"
                  value={isOffline ? "Offline" : "Online"}
                />
                {pendingSync && (
                  <SettingsRow
                    icon={RefreshCw}
                    label="Pending Sync"
                    value="Changes waiting to sync"
                    onClick={() => { sync(); toast({ title: "Syncing..." }); }}
                  />
                )}
                {lastSyncedAt && (
                  <SettingsRow
                    icon={Clock}
                    label="Last Synced"
                    value={new Date(lastSyncedAt).toLocaleString()}
                  />
                )}
              </div>

              {/* ── TRAVEL SETTINGS ── */}
              <SectionHeader>Travel Settings</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={Ruler} label="Distance Unit" value={distanceUnit === "km" ? "Kilometers" : "Miles"} onClick={() => {
                  setDistanceUnit(prev => prev === "km" ? "mi" : "km");
                  toast({ title: distanceUnit === "km" ? "Switched to Miles" : "Switched to Kilometers" });
                }} trailing={<span className="text-xs text-muted-foreground">{distanceUnit === "km" ? "km" : "mi"}</span>} />
                <SettingsRow icon={DollarSign} label="Currency" value={currency} />
                <SettingsRow icon={Clock} label="Time Zone" value={timezone} />
              </div>

              {/* ── DATA ── */}
              <SectionHeader>Data</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={Trash2} label="Clear Cache" destructive />
                <SettingsRow icon={Download} label="Download My Data" />
                <SettingsRow icon={FileUp} label="Export Travel History" />
              </div>

              {/* ── SUPPORT ── */}
              <SectionHeader>Support</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={HelpCircle} label="Help Center" />
                <SettingsRow icon={MessageCircle} label="Contact Support" />
                <SettingsRow icon={AlertTriangle} label="Report Problem" />
                <SettingsRow icon={MessageCircle} label="Send Feedback" />
                <SettingsRow icon={Info} label="About OXEN" />
              </div>

              {/* ── LOG OUT — hidden for guest users ── */}
              {!user.isGuest && (
                <div className="mt-6 px-2">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3.5 text-sm font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-[0.98]"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              )}

              <p className="mt-5 text-center text-[11px] text-muted-foreground">
                OXEN v1.0.0 — Built for explorers
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
