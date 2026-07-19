import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileStack,
  Package,
  UserCog,
  CheckSquare,
  MessageSquare,
  Newspaper,
  CreditCard,
  BarChart3,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import LogoutDialog from "@/components/LogoutDialog";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  phase2?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/consulting/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/consulting/clients", label: "Clients", icon: Users },
  { to: "/consulting/applications", label: "Applications", icon: FileStack },
  { to: "/consulting/packages", label: "Service Packages", icon: Package },
  { to: "/consulting/employees", label: "Employees", icon: UserCog },
  { to: "/consulting/tasks", label: "Tasks", icon: CheckSquare, phase2: true },
  { to: "/consulting/messages", label: "Messages", icon: MessageSquare, phase2: true },
  { to: "/consulting/posts", label: "Posts", icon: Newspaper, phase2: true },
  { to: "/consulting/payments", label: "Payments", icon: CreditCard, phase2: true },
  { to: "/consulting/analytics", label: "Analytics", icon: BarChart3, phase2: true },
  { to: "/consulting/reviews", label: "Reviews", icon: Star, phase2: true },
  { to: "/consulting/company-profile", label: "Company Profile", icon: Building2, phase2: true },
  { to: "/consulting/subscription", label: "Subscription", icon: SubscriptionIcon, phase2: true },
  { to: "/consulting/settings", label: "Settings", icon: SettingsIcon, phase2: true },
  { to: "/consulting/support", label: "Help & Support", icon: LifeBuoy, phase2: true },
];

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({ title, subtitle, actions, children }: DashboardShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, member } = useConsulting();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const companyName = company?.name ?? "Consulting Dashboard";

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className={cn("min-w-0", collapsed && "hidden")}>
          <p className="truncate font-display text-sm font-bold text-foreground">OXEN</p>
          <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
            Consulting
          </p>
        </div>
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
                  onClick={() => {
                    if (item.phase2) return;
                    navigate(item.to);
                    setMobileOpen(false);
                  }}
                  disabled={item.phase2}
                  title={item.phase2 ? `${item.label} — coming in Phase 2` : item.label}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                    active
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                    item.phase2 && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
                  {item.phase2 && !collapsed && (
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
