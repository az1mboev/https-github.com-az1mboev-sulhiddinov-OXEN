import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Languages,
  Plane,
  Award,
  FileText,
  Star,
  Package as PackageIcon,
  Newspaper,
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  Share2,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchPublicConsultingCompany, type ConsultingCompany } from "@/lib/consulting";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Tab = "overview" | "packages" | "posts" | "reviews" | "contact";

const TABS: { id: Tab; label: string; icon: typeof Star }[] = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "packages", label: "Packages", icon: PackageIcon },
  { id: "posts", label: "Posts", icon: Newspaper },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "contact", label: "Contact", icon: MessageSquare },
];

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

export default function PublicCompanyProfile() {
  const { companyId = "" } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: company, isLoading } = useQuery({
    queryKey: ["public-consulting-company", companyId],
    queryFn: () => fetchPublicConsultingCompany(companyId),
    enabled: !!companyId,
    retry: false,
    staleTime: 60_000,
  });

  useSEO({
    title: company ? `${company.name} | OXEN Consulting` : "Company | OXEN Consulting",
    description: company?.description ?? "Consulting company public profile on OXEN.",
    image: company?.logo_url ?? undefined,
  });

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: company?.name ?? "OXEN Consulting", url }).catch(() => void 0);
    } else {
      void navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Profile link copied to clipboard." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  // Not published or not found → professional "not available" state.
  if (!company) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] text-muted-foreground">
          <Building2 className="h-7 w-7" />
        </span>
        <h1 className="font-display text-xl font-extrabold">Profile not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This consulting company profile is either unpublished or doesn't exist. Public profiles are visible
          only when the company marks itself as published.
        </p>
        <button
          onClick={() => navigate("/explore")}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to OXEN
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-4 sm:px-6">
      {/* Back */}
      <button
        onClick={() => navigate("/explore")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Cover + logo header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="glass overflow-hidden rounded-3xl"
      >
        <div className="relative h-40 w-full bg-gradient-to-br from-primary/25 via-primary/5 to-transparent sm:h-56">
          {company.cover_image_url ? (
            <img src={company.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <Building2 className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-card">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/15 text-primary">
                    <Building2 className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="mb-1">
                <h1 className="font-display text-xl font-extrabold text-foreground sm:text-2xl">{company.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[company.city, company.country].filter(Boolean).join(", ") || "Location not set"}
                  </span>
                  {company.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1]"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>

          {company.description && (
            <p className="mt-4 text-sm text-muted-foreground">{company.description}</p>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 mt-5 -mx-4 bg-background/80 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:px-2">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/[0.04] text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            {tab === "overview" && <OverviewTab company={company} />}
            {tab === "packages" && <EmptyTab icon={PackageIcon} title="No packages yet" description="This company hasn't published any service packages." />}
            {tab === "posts" && <EmptyTab icon={Newspaper} title="No posts yet" description="This company hasn't published any posts." />}
            {tab === "reviews" && <EmptyTab icon={Star} title="No reviews yet" description="Client reviews will appear here once the company has completed projects." />}
            {tab === "contact" && <ContactTab company={company} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function OverviewTab({ company }: { company: ConsultingCompany }) {
  const rows: { icon: typeof Globe; label: string; value: string }[] = [
    { icon: Award, label: "Years of experience", value: String(company.years_experience ?? 0) },
    { icon: Clock, label: "Working hours", value: company.working_hours || "—" },
    {
      icon: Languages,
      label: "Supported languages",
      value: company.supported_languages?.length ? company.supported_languages.join(", ") : "—",
    },
    {
      icon: Plane,
      label: "Destination countries",
      value: company.destination_countries?.length ? company.destination_countries.join(", ") : "—",
    },
    { icon: FileText, label: "License information", value: company.license_info || "—" },
  ];
  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <h2 className="mb-4 font-display text-base font-bold text-foreground">About</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="rounded-2xl bg-white/[0.03] p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {r.label}
              </dt>
              <dd className="mt-1 break-words text-sm text-foreground">{r.value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function ContactTab({ company }: { company: ConsultingCompany }) {
  const rows: { icon: typeof Globe; label: string; value: string | null }[] = [
    { icon: Phone, label: "Phone", value: company.contact_phone },
    { icon: Mail, label: "Email", value: company.contact_email },
    { icon: Globe, label: "Website", value: company.website },
    { icon: MapPin, label: "Address", value: [company.address, company.city, company.country].filter(Boolean).join(", ") || null },
  ];
  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <h2 className="mb-4 font-display text-base font-bold text-foreground">Contact information</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => {
          const Icon = r.icon;
          const value = r.value;
          return (
            <div key={r.label} className="rounded-2xl bg-white/[0.03] p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {r.label}
              </dt>
              <dd className="mt-1 break-words text-sm text-foreground">
                {value ? (
                  r.label === "Website" ? (
                    <a href={value} target="_blank" rel="noreferrer" className="text-primary underline">
                      {value}
                    </a>
                  ) : r.label === "Email" ? (
                    <a href={`mailto:${value}`} className="text-primary underline">{value}</a>
                  ) : r.label === "Phone" ? (
                    <a href={`tel:${value}`} className="text-primary underline">{value}</a>
                  ) : (
                    value
                  )
                ) : (
                  "—"
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function EmptyTab({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Star;
  title: string;
  description: string;
}) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-3xl p-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
