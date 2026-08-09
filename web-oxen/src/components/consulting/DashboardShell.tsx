import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileStack,
  Package,
  ShoppingCart,
  Wallet,
  UserCog,
  BarChart3,
  Activity,
  Star,
  Building2,
  CreditCard as SubscriptionIcon,
  Settings as SettingsIcon,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronLeft,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import LogoutDialog from "@/components/LogoutDialog";
import { getPlan } from "@/lib/consulting";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Routes not built yet — clicking shows the "next phase" page (still navigable). */
  comingNext?: boolean;
}

// Recommended order per spec. POS and Cashier are fully functional (no "Soon" label).
const NAV_ITEMS: NavItem[] = [
  { to: "/consulting/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/consulting/clients", label: "Clients", icon: Users },
  { to: "/consulting/applications", label: "Applications", icon: FileStack },
  { to: "/consulting/packages", label: "Service Packages", icon: Package },
  { to: "/consulting/pos", label: "POS", icon: ShoppingCart },
  { to: "/consulting/cashier", label: "Cashier", icon: Wallet },
  { to: "/consulting/employees", label: "Employees", icon: UserCog },
  { to: "/consulting/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/consulting/activity", label: "Activity Log", icon: Activity },
  { to: "/consulting/reviews", label: "Reviews", icon: Star, comingNext: true },
  { to: "/consulting/company-profile", label: "Profile", icon: Building2 },
  { to: "/consulting/subscription", label: "Subscription", icon: SubscriptionIcon, comingNext: true },
  { to: "/consulting/settings", label: "Settings", icon: SettingsIcon, comingNext: true },
  { to: "/consulting/support", label: "Help & Support", icon: LifeBuoy, comingNext: true },
];

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** When true, show a back button that navigates one step back in router history. */
  showBack?: boolean;
  children: ReactNode;
}

export function DashboardShell({ title, subtitle, actions, showBack = false, children }: DashboardShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, member, isTestMode, subscriptionPlan, subscriptionEndDate, subscriptionAccess } = useConsulting();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const companyName = company?.name ?? "Consulting Dashboard";
  const logoUrl = company?.logo_url ?? null;
  const plan = subscriptionPlan ? getPlan(subscriptionPlan) : null;

  const formatEndDate = (iso: string | null): string => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "—";
    }
  };

  const go = (item: NavItem) => {
    navigate(item.to);
    setMobileOpen(false);
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand + subscription block */}
      <div className="border-b border-white/[0.06] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-primary">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </span>
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="truncate font-display text-sm font-bold text-foreground">{companyName}</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
              OXEN Consulting
            </p>
          </div>
        </div>
        {/* Subscription info */}
        {!collapsed && (
          <div className="mt-3 space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan</span>
              <span className="text-[11px] font-bold text-foreground">{plan?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="h-2.5 w-2.5" /> Expires
              </span>
              <span className="text-[11px] font-semibold text-foreground">{formatEndDate(subscriptionEndDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                  subscriptionAccess === "active"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : subscriptionAccess === "expired"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-white/[0.06] text-muted-foreground",
                )}
              >
                {subscriptionAccess === "active" ? "Active" : subscriptionAccess === "expired" ? "Expired" : "None"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <li key={item.to}>
                <button
                  onClick={() => go(item)}
                  title={item.label}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                    active
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
                  {item.comingNext && !collapsed && (
                    <span className="ml-auto rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Soon
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Test-mode badge */}
      {isTestMode && !collapsed && (
        <div className="mx-3 mb-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-1.5 text-center text-[10px] font-semibold text-amber-200/90">
          Test Mode — DB not connected
        </div>
      )}

      {/* User + logout */}
      <div className="border-t border-white/[0.06] p-3">
        <div className={cn("flex items-center gap-2.5 rounded-xl p-2", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-[10px] capitalize text-muted-foreground">{member?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setLogoutOpen(true)}
          className={cn(
            "mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive transition hover:bg-destructive/10",
            collapsed && "justify-center",
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-white/[0.06] bg-sidebar/60 backdrop-blur-xl transition-all duration-300 lg:block",
          collapsed ? "w-[72px]" : "w-[248px]",
        )}
      >
        {SidebarContent}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-card/80 text-muted-foreground transition hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-[81] w-[264px] border-r border-white/[0.06] bg-sidebar/95 backdrop-blur-xl lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/[0.06] bg-card/40 px-4 py-3 backdrop-blur-xl lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {/* Company logo + name */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold text-foreground lg:text-lg">
                {companyName}
              </h1>
              {subtitle && (
                <p className="truncate text-[11px] text-muted-foreground lg:text-xs">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search…"
                className="w-44 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none lg:w-56"
              />
            </div>
          </div>

          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-5 pb-28 lg:px-6 lg:pb-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-extrabold text-foreground lg:text-2xl">
                  {title}
                </h2>
              </div>
              {actions && <div className="shrink-0">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>

      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
