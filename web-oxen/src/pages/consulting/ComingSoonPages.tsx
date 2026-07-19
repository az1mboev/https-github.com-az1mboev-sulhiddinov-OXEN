import {
  Users,
  FileStack,
  Package,
  UserCog,
  Newspaper,
  CreditCard,
  BarChart3,
  Star,
  CreditCard as SubscriptionIcon,
  Settings as SettingsIcon,
  LifeBuoy,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { ModuleComingSoon } from "@/components/consulting/ModuleComingSoon";
import { useSEO } from "@/hooks/use-seo";

/**
 * Wrapper pages for consulting dashboard sections that are not built yet.
 * Each renders the polished ModuleComingSoon inside the shared DashboardShell
 * so navigation stays consistent and there are no broken buttons.
 */

function ComingSoonPage({
  title,
  icon,
  description,
  features,
}: {
  title: string;
  icon: Parameters<typeof ModuleComingSoon>[0]["icon"];
  description: string;
  features?: string[];
}) {
  useSEO({ title: `${title} | OXEN Consulting`, description });
  return (
    <DashboardShell title={title}>
      <ModuleComingSoon title={title} icon={icon} description={description} features={features} />
    </DashboardShell>
  );
}

export function ClientsComingSoon() {
  return (
    <ComingSoonPage
      title="Clients"
      icon={Users}
      description="Manage your client roster: profiles, contact info, assigned employees, payment and application status, notes, and full history."
      features={[
        "Client table with search & filters",
        "Client profile slide-over",
        "Assign employees to clients",
        "Internal notes (private)",
        "Archive & restore",
      ]}
    />
  );
}

export function ApplicationsComingSoon() {
  return (
    <ComingSoonPage
      title="Applications"
      icon={FileStack}
      description="Track every client application from new lead to final decision, with a Kanban board and full status history."
      features={[
        "Table + Kanban toggle",
        "Drag-and-drop status changes",
        "Required documents checklist",
        "Application timeline",
        "Internal notes & client-visible updates",
      ]}
    />
  );
}

export function PackagesComingSoon() {
  return (
    <ComingSoonPage
      title="Service Packages"
      icon={Package}
      description="Create and publish visa, travel, and consultation packages that clients can discover and purchase."
      features={[
        "Create / edit / duplicate packages",
        "Publish & unpublish",
        "Cover image, gallery, video",
        "Included services & required documents",
        "FAQ, refund conditions, available slots",
      ]}
    />
  );
}

export function EmployeesComingSoon() {
  return (
    <ComingSoonPage
      title="Employees"
      icon={UserCog}
      description="Invite consultants and managers, assign roles, and track team performance."
      features={[
        "Invite by email",
        "Roles: Owner, Admin, Manager, Consultant, …",
        "Assign clients to employees",
        "Performance stats per employee",
        "Activate / suspend / remove",
      ]}
    />
  );
}

export function PostsComingSoon() {
  return (
    <ComingSoonPage
      title="Posts"
      icon={Newspaper}
      description="Publish articles and updates to your public company profile."
      features={["Rich-text editor", "Cover images", "Publish / draft / schedule", "Post analytics"]}
    />
  );
}

export function PaymentsComingSoon() {
  return (
    <ComingSoonPage
      title="Payments"
      icon={CreditCard}
      description="Review subscription and package payments, refunds, and revenue."
      features={["Transaction list", "Refunds", "Export to CSV", "Commission & net revenue"]}
    />
  );
}

export function AnalyticsComingSoon() {
  return (
    <ComingSoonPage
      title="Analytics"
      icon={BarChart3}
      description="Deep-dive into clients, revenue, conversion, and employee performance."
      features={["Revenue trends", "Conversion funnel", "Client demographics", "Employee performance", "Export reports"]}
    />
  );
}

export function ReviewsComingSoon() {
  return (
    <ComingSoonPage
      title="Reviews"
      icon={Star}
      description="Read and respond to client reviews of your consulting services."
      features={["Review list", "Reply to reviews", "Rating breakdown", "Flag inappropriate reviews"]}
    />
  );
}

export function SubscriptionComingSoon() {
  return (
    <ComingSoonPage
      title="Subscription"
      icon={SubscriptionIcon}
      description="Manage your OXEN Consulting subscription plan, billing, and renewal."
      features={["Change plan", "Update payment method", "View invoices", "Cancel subscription"]}
    />
  );
}

export function SettingsComingSoon() {
  return (
    <ComingSoonPage
      title="Settings"
      icon={SettingsIcon}
      description="Configure your company settings: team, security, notifications, and more."
      features={["Company information", "Team & permissions", "Security", "Notifications", "Language & currency"]}
    />
  );
}

export function SupportComingSoon() {
  return (
    <ComingSoonPage
      title="Help & Support"
      icon={LifeBuoy}
      description="Get help from the OXEN team with your consulting dashboard."
      features={["Contact support", "Knowledge base", "Live chat (Phase 2)", "System status"]}
    />
  );
}
