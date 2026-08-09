import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, Phone, Mail, Globe, Clock, Languages, Plane,
  Award, FileText, CheckCircle2, ArrowLeft, Share2, Loader2,
  Package as PackageIcon, MessageCircle, Send, Instagram, Facebook,
  Youtube, MapPinned, Star, ImageIcon, ShieldCheck, Calendar,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchPublicConsultingCompany, type ConsultingCompany } from "@/lib/consulting";
import { fetchServicesByConsulting, type Service } from "@/lib/services";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Tab = "overview" | "services" | "photos" | "locations" | "contact";

const TABS: { id: Tab; label: string; icon: typeof Star }[] = [
  { id: "overview", label: "About", icon: FileText },
  { id: "services", label: "Services", icon: PackageIcon },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "locations", label: "Locations", icon: MapPinned },
  { id: "contact", label: "Contact", icon: MessageCircle },
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

  const { data: services } = useQuery({
    queryKey: ["agency-services", companyId],
    queryFn: () => fetchServicesByConsulting(companyId),
    enabled: !!companyId && !!company,
    staleTime: 60_000,
  });

  useSEO({
    title: company ? `${company.name} | OXEN Agency` : "Agency | OXEN",
    description: company?.short_description ?? company?.description ?? "Tour agency profile on OXEN.",
    image: company?.logo_url ?? undefined,
  });

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: company?.name ?? "OXEN Agency", url }).catch(() => void 0);
    } else {
      void navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Agency link copied to clipboard." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] text-muted-foreground">
          <Building2 className="h-7 w-7" />
        </span>
        <h1 className="font-display text-xl font-extrabold">Agency not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This agency profile is either unpublished or doesn't exist.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to OXEN
        </button>
      </div>
    );
  }

  const socialLinks = company.social_links ?? {};
  const photos = company.agency_photos ?? [];
  const branches = company.branches ?? [];
  const activeServices = services ?? [];

  // Contact buttons — only show if data exists
  const contactButtons: { icon: typeof Phone; label: string; href: string; color: string }[] = [];
  if (company.contact_phone) contactButtons.push({ icon: Phone, label: "Call", href: `tel:${company.contact_phone}`, color: "bg-emerald-500/15 text-emerald-400" });
  if (company.whatsapp) contactButtons.push({ icon: MessageCircle, label: "WhatsApp", href: `https://wa.me/${company.whatsapp.replace(/\D/g, "")}`, color: "bg-green-500/15 text-green-400" });
  if (company.telegram) contactButtons.push({ icon: Send, label: "Telegram", href: company.telegram.startsWith("@") ? `https://t.me/${company.telegram.slice(1)}` : company.telegram, color: "bg-sky-500/15 text-sky-400" });
  if (socialLinks.instagram) contactButtons.push({ icon: Instagram, label: "Instagram", href: socialLinks.instagram, color: "bg-fuchsia-500/15 text-fuchsia-400" });
  if (company.website) contactButtons.push({ icon: Globe, label: "Website", href: company.website, color: "bg-blue-500/15 text-blue-400" });
  if (company.map_link) contactButtons.push({ icon: MapPin, label: "Location", href: company.map_link, color: "bg-amber-500/15 text-amber-400" });

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-4 sm:px-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
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
                  {company.verification_status === "verified" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Verified Agency
                    </span>
                  )}
                  {activeServices.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <PackageIcon className="h-3 w-3" /> {activeServices.length} {activeServices.length === 1 ? "service" : "services"}
                    </span>
                  )}
                </div>
                {company.short_description && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{company.short_description}</p>
                )}
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

          {/* Contact buttons */}
          {contactButtons.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {contactButtons.map((btn) => {
                const Icon = btn.icon;
                return (
                  <a
                    key={btn.label}
                    href={btn.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-95", btn.color)}
                  >
                    <Icon className="h-3.5 w-3.5" /> {btn.label}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 mt-5 -mx-4 bg-background/80 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:px-2">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const count = t.id === "services" ? activeServices.length : t.id === "photos" ? photos.length : undefined;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition",
                  active ? "bg-primary text-primary-foreground" : "bg-white/[0.04] text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
                {count !== undefined && count > 0 && (
                  <span className="ml-0.5 rounded-full bg-white/15 px-1.5 text-[10px] font-bold">{count}</span>
                )}
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
            {tab === "services" && <ServicesTab services={activeServices} />}
            {tab === "photos" && <PhotosTab photos={photos} />}
            {tab === "locations" && <LocationsTab company={company} branches={branches} />}
            {tab === "contact" && <ContactTab company={company} socialLinks={socialLinks} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function OverviewTab({ company }: { company: ConsultingCompany }) {
  const specialties = company.specialties ?? [];
  const rows: { icon: typeof Globe; label: string; value: string }[] = [
    { icon: Calendar, label: "Founded", value: company.founded_year ? String(company.founded_year) : "—" },
    { icon: Award, label: "Years of experience", value: String(company.years_experience ?? 0) },
    { icon: Clock, label: "Working hours", value: company.working_hours || "—" },
    {
      icon: Languages,
      label: "Languages",
      value: company.supported_languages?.length ? company.supported_languages.join(", ") : "—",
    },
    {
      icon: Plane,
      label: "Destinations",
      value: company.destination_countries?.length ? company.destination_countries.join(", ") : "—",
    },
  ];
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base font-bold text-foreground">About</h2>
        {company.description && <p className="mb-4 text-sm text-muted-foreground">{company.description}</p>}
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
      {specialties.length > 0 && (
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="mb-3 font-display text-base font-bold text-foreground">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span key={s} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ServicesTab({ services }: { services: Service[] }) {
  const navigate = useNavigate();
  if (services.length === 0) {
    return <EmptyTab icon={PackageIcon} title="No services yet" description="This agency hasn't published any services or tour packages." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, ...springIn }}
          className="glass group cursor-pointer overflow-hidden rounded-2xl"
          onClick={() => navigate(`/services/${s.id}`)}
        >
          <div className="relative h-36 w-full overflow-hidden bg-white/[0.03]">
            {s.cover_image ? (
              <img src={s.cover_image} alt={s.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/30">
                <PackageIcon className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{s.category}</span>
            <h3 className="mt-1 font-display text-sm font-bold text-foreground">{s.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-display text-sm font-extrabold text-foreground">
                {s.price > 0 ? `${s.currency} ${s.price.toLocaleString()}` : "Contact for price"}
              </span>
              {s.duration && <span className="text-[11px] text-muted-foreground">{s.duration}</span>}
            </div>
            {s.rating > 0 && (
              <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-400">
                <Star className="h-3 w-3 fill-amber-400" /> {s.rating.toFixed(1)} ({s.review_count} reviews)
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PhotosTab({ photos }: { photos: string[] }) {
  if (photos.length === 0) {
    return <EmptyTab icon={ImageIcon} title="No photos yet" description="This agency hasn't uploaded any photos." />;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((url, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, ...springIn }}
          className="aspect-square overflow-hidden rounded-2xl bg-white/[0.03]"
        >
          <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
        </motion.div>
      ))}
    </div>
  );
}

function LocationsTab({ company, branches }: { company: ConsultingCompany; branches: Array<{ name: string; address: string; phone: string; working_hours: string; map_link: string }> }) {
  const mainLocation = {
    name: "Main Office",
    address: [company.address, company.city, company.country].filter(Boolean).join(", ") || null,
    phone: company.contact_phone,
    working_hours: company.working_hours,
    map_link: company.map_link,
  };
  const allLocations = [mainLocation, ...branches].filter((l) => l.address || l.phone);
  if (allLocations.length === 0) {
    return <EmptyTab icon={MapPinned} title="No locations" description="This agency hasn't added location information." />;
  }
  return (
    <div className="space-y-3">
      {allLocations.map((loc, i) => (
        <div key={i} className="glass rounded-2xl p-4">
          <h3 className="font-display text-sm font-bold text-foreground">{loc.name || `Branch ${i + 1}`}</h3>
          {loc.address && <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {loc.address}</p>}
          <div className="mt-2 flex flex-wrap gap-3">
            {loc.phone && <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Phone className="h-3.5 w-3.5" /> {loc.phone}</a>}
            {loc.working_hours && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {loc.working_hours}</span>}
            {loc.map_link && <a href={loc.map_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><MapPin className="h-3.5 w-3.5" /> View on map</a>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactTab({ company, socialLinks }: { company: ConsultingCompany; socialLinks: Record<string, string> }) {
  const rows: { icon: typeof Globe; label: string; value: string | null; href?: string }[] = [
    { icon: Phone, label: "Main phone", value: company.contact_phone, href: company.contact_phone ? `tel:${company.contact_phone}` : undefined },
    { icon: Phone, label: "Additional phone", value: company.additional_phone, href: company.additional_phone ? `tel:${company.additional_phone}` : undefined },
    { icon: MessageCircle, label: "WhatsApp", value: company.whatsapp, href: company.whatsapp ? `https://wa.me/${company.whatsapp.replace(/\D/g, "")}` : undefined },
    { icon: Send, label: "Telegram", value: company.telegram, href: company.telegram ? (company.telegram.startsWith("@") ? `https://t.me/${company.telegram.slice(1)}` : company.telegram) : undefined },
    { icon: Mail, label: "Email", value: company.contact_email, href: company.contact_email ? `mailto:${company.contact_email}` : undefined },
    { icon: Globe, label: "Website", value: company.website, href: company.website ?? undefined },
    { icon: Instagram, label: "Instagram", value: socialLinks.instagram ?? null, href: socialLinks.instagram ?? undefined },
    { icon: Facebook, label: "Facebook", value: socialLinks.facebook ?? null, href: socialLinks.facebook ?? undefined },
    { icon: Youtube, label: "YouTube", value: socialLinks.youtube ?? null, href: socialLinks.youtube ?? undefined },
    { icon: MapPin, label: "Address", value: [company.address, company.city, company.country].filter(Boolean).join(", ") || null },
  ];
  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <h2 className="mb-4 font-display text-base font-bold text-foreground">Contact information</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.filter((r) => r.value).map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="rounded-2xl bg-white/[0.03] p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {r.label}
              </dt>
              <dd className="mt-1 break-words text-sm text-foreground">
                {r.href ? (
                  <a href={r.href} target="_blank" rel="noreferrer" className="text-primary underline">{r.value}</a>
                ) : (
                  r.value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function EmptyTab({ icon: Icon, title, description }: { icon: typeof Star; title: string; description: string }) {
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

