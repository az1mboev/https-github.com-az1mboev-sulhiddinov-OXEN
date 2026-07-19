import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package as PackageIcon,
  ArrowLeft,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
  FileText,
  HelpCircle,
  Users,
  Shield,
  Star,
  Phone,
  Mail,
  Globe,
  Building2,
  Video as VideoIcon,
} from "lucide-react";

import { useSEO } from "@/hooks/use-seo";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPublicPackage, type ConsultingPackage, type ConsultingCompany } from "@/lib/consulting";
import { testFetchPackages } from "@/lib/consulting-test-mode";
import { Accordion } from "@/components/consulting/Field";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { OptimizedImage } from "@/components/OptimizedImage";
import { FlagImage } from "@/components/FlagImage";

/* ============================================================
   Public Package Page — /consulting/package/:packageId
   ------------------------------------------------
   Published-gated: only renders when the package has
   is_published = true. Otherwise shows "Package not available".
   In test mode, packages live in localStorage and are only
   readable when the visitor is the company owner.
   ============================================================ */

interface PackageJoined extends ConsultingPackage {
  consulting_companies?: ConsultingCompany;
}

export default function PublicPackagePage() {
  const { packageId = "" } = useParams();
  const { user } = useAuth();

  useSEO({ title: "Service Package | OXEN Consulting", description: "View this consulting service package" });

  // We don't know in advance whether this package is real or test-mode.
  // Try real fetch first; if it returns null, try test-mode (only if the
  // current user owns the test company).
  const real = useQuery({
    queryKey: ["public-package", packageId],
    queryFn: () => fetchPublicPackage(packageId),
    enabled: !!packageId,
    staleTime: 30_000,
    retry: false,
  });

  // Test-mode lookup: packages are stored under the test company id
  // which is derived from the current user's id.
  const testCompanyId = user && !user.isGuest ? `test-company-${user.id}` : null;
  const testPkg = useQuery({
    queryKey: ["test-package", packageId, testCompanyId],
    queryFn: () => {
      if (!testCompanyId) return null;
      const found = testFetchPackages(testCompanyId).find((p) => p.id === packageId);
      return found && found.is_published ? found : null;
    },
    enabled: !!packageId && !!testCompanyId && !real.data?.pkg,
    staleTime: 0,
  });

  if (real.isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="oxen-skeleton-globe" aria-label="Loading" />
      </div>
    );
  }

  // Prefer real, fall back to test
  const pkg: ConsultingPackage | null = real.data?.pkg ?? testPkg.data ?? null;
  const company: ConsultingCompany | null = real.data?.company ?? null;
  const media = real.data?.media ?? [];
  const contactInfo = (pkg?.contact_info as { video_url?: string; long_description?: string } | null) ?? null;
  const gallery: string[] = media.filter((m) => m.kind === "image").map((m) => m.url);
  const videoUrl: string | null = contactInfo?.video_url ?? null;
  const longDescription: string | null = contactInfo?.long_description ?? null;

  if (!pkg) {
    return <NotAvailable />;
  }

  const included = (pkg.included_services as unknown as string[]) ?? [];
  const requiredDocs = (pkg.required_documents as unknown as string[]) ?? [];
  const benefits = (pkg.what_client_receives as unknown as string[]) ?? [];
  const faq = (pkg.faq as unknown as { question: string; answer: string }[]) ?? [];

  const currency = pkg.service?.currency ?? "USD";
  const price = Number(pkg.service?.price ?? 0);
  const countryName = pkg.destination_country ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Back link */}
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <Link
          to={company ? `/consulting/company/${company.id}` : "/explore"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to company profile
        </Link>
      </div>

      {/* Hero / cover */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="glass overflow-hidden rounded-3xl"
        >
          <div className="relative h-52 w-full overflow-hidden bg-white/[0.03] sm:h-64">
            {pkg.service?.cover_image ? (
              <img src={pkg.service.cover_image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <PackageIcon className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <StatusBadge status="active" label="Published" />
              {pkg.service?.category && <StatusBadge status="none" label={pkg.service.category} />}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
                  {pkg.service?.title ?? "Untitled Package"}
                </h1>
                {pkg.service?.description && (
                  <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{pkg.service.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-extrabold text-primary">
                  {currency} {price.toLocaleString()}
                </p>
                {pkg.estimated_processing_time && (
                  <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> {pkg.estimated_processing_time}
                  </p>
                )}
              </div>
            </div>

            {/* Quick facts */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickFact icon={MapPin} label="Destination" value={countryName || "—"} />
              <QuickFact icon={DollarSign} label="Price" value={`${currency} ${price.toLocaleString()}`} />
              <QuickFact icon={Clock} label="Processing" value={pkg.estimated_processing_time ?? "—"} />
              <QuickFact
                icon={Users}
                label="Availability"
                value={pkg.available_slots != null && pkg.available_slots > 0
                  ? `${pkg.available_slots} slots`
                  : "Open"}
              />
            </div>

            {/* Company header */}
            {company && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{company.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {company.country ?? "—"}{company.city ? `, ${company.city}` : ""}
                  </p>
                </div>
                {company.is_verified && <StatusBadge status="active" label="Verified" />}
                <Link
                  to={`/consulting/company/${company.id}`}
                  className="rounded-xl bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-white/[0.08]"
                >
                  View profile
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Body grid */}
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Long description */}
            {longDescription && (
              <Section title="About this package" icon={FileText}>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{longDescription}</p>
              </Section>
            )}

            {/* Video */}
            {videoUrl && (
              <Section title="Video" icon={VideoIcon}>
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
                  <div className="relative pb-[56.25%]">
                    <iframe
                      src={embedUrl(videoUrl)}
                      title="Package video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                </div>
              </Section>
            )}

            {/* Gallery */}
            {gallery.length > 0 && (
              <Section title="Gallery" icon={PackageIcon}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {gallery.map((url, i) => (
                    <div key={i} className="aspect-square overflow-hidden rounded-xl border border-white/[0.06]">
                      <OptimizedImage src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Included services */}
            {included.length > 0 && (
              <Section title="What's included" icon={CheckCircle2}>
                <ul className="space-y-2">
                  {included.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Benefits */}
            {benefits.length > 0 && (
              <Section title="What you'll receive" icon={Star}>
                <ul className="space-y-2">
                  {benefits.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <Star className="mt-0.5 h-4 w-4 shrink-0 fill-primary text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Required documents */}
            {requiredDocs.length > 0 && (
              <Section title="Required documents" icon={FileText}>
                <ul className="space-y-2">
                  {requiredDocs.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Who this is for */}
            {pkg.who_this_is_for && (
              <Section title="Who this package is for" icon={Users}>
                <p className="text-sm text-muted-foreground">{pkg.who_this_is_for}</p>
              </Section>
            )}

            {/* Refund */}
            {pkg.refund_conditions && (
              <Section title="Refund conditions" icon={Shield}>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{pkg.refund_conditions}</p>
              </Section>
            )}

            {/* FAQ */}
            {faq.length > 0 && (
              <Section title="Frequently asked questions" icon={HelpCircle}>
                <Accordion items={faq} />
              </Section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <p className="font-display text-xl font-extrabold text-primary">
                {currency} {price.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">One-time package fee</p>

              {countryName && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[0.02] px-3 py-2 text-xs text-foreground">
                  Destination: {countryName}
                </div>
              )}

              {pkg.available_slots != null && pkg.available_slots > 0 && (
                <p className="mt-3 text-[11px] text-amber-300/90">
                  Only {pkg.available_slots} slots remaining
                </p>
              )}

              <Link
                to={company ? `/consulting/company/${company.id}` : "/explore"}
                className="gold-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95"
              >
                Contact company
              </Link>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                You'll be redirected to the company profile to get in touch.
              </p>
            </div>

            {company && <CompanyContactCard company={company} />}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function NotAvailable() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <PackageIcon className="h-7 w-7" />
      </span>
      <h1 className="font-display text-xl font-extrabold text-foreground">Package not available</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This package is either unpublished, has been removed, or you don't have access to view it.
      </p>
      <Link
        to="/explore"
        className="gold-gradient mt-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
      >
        Back to Explore
      </Link>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function QuickFact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function CompanyContactCard({ company }: { company: ConsultingCompany }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-display text-sm font-bold text-foreground">Contact information</h3>
      <div className="mt-3 space-y-2 text-xs">
        {company.contact_phone && (
          <a href={`tel:${company.contact_phone}`} className="flex items-center gap-2 text-muted-foreground transition hover:text-foreground">
            <Phone className="h-3.5 w-3.5" /> {company.contact_phone}
          </a>
        )}
        {company.contact_email && (
          <a href={`mailto:${company.contact_email}`} className="flex items-center gap-2 text-muted-foreground transition hover:text-foreground">
            <Mail className="h-3.5 w-3.5" /> {company.contact_email}
          </a>
        )}
        {company.website && (
          <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground transition hover:text-foreground">
            <Globe className="h-3.5 w-3.5" /> Visit website
          </a>
        )}
        {company.working_hours && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {company.working_hours}
          </p>
        )}
      </div>
    </div>
  );
}

/** Convert a YouTube watch URL into an embeddable URL. Passes through other URLs. */
function embedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}
