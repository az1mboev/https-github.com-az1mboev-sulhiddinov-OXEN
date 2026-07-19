import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2,
  Upload,
  Save,
  X,
  Edit3,
  Eye,
  Loader2,
  CheckCircle2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Clock,
  Languages,
  Plane,
  Award,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { Field, SelectField } from "@/components/consulting/Field";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  updateCompanyProfile,
  uploadConsultingAsset,
  type ConsultingCompany,
} from "@/lib/consulting";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

const LANGUAGES = [
  "English", "Russian", "Uzbek", "Kazakh", "Turkish", "Arabic", "Chinese",
  "Korean", "Japanese", "German", "French", "Spanish", "Italian", "Portuguese",
  "Hindi", "Persian", "Tajik", "Kyrgyz", "Turkmen", "Azerbaijani",
];

interface ProfileForm {
  name: string;
  description: string;
  country: string;
  city: string;
  address: string;
  contact_phone: string;
  contact_email: string;
  website: string;
  working_hours: string;
  years_experience: string;
  license_info: string;
  supported_languages: string[];
  destination_countries: string[];
  logo_url: string;
  cover_image_url: string;
  is_published: boolean;
}

function formFromCompany(c: ConsultingCompany | null): ProfileForm {
  return {
    name: c?.name ?? "",
    description: c?.description ?? "",
    country: c?.country ?? "",
    city: c?.city ?? "",
    address: c?.address ?? "",
    contact_phone: c?.contact_phone ?? "",
    contact_email: c?.contact_email ?? "",
    website: c?.website ?? "",
    working_hours: c?.working_hours ?? "",
    years_experience: c ? String(c.years_experience ?? 0) : "0",
    license_info: c?.license_info ?? "",
    supported_languages: c?.supported_languages ?? [],
    destination_countries: c?.destination_countries ?? [],
    logo_url: c?.logo_url ?? "",
    cover_image_url: c?.cover_image_url ?? "",
    is_published: c?.is_published ?? false,
  };
}

export default function CompanyProfile() {
  const { company, isTestMode } = useConsulting();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(formFromCompany(company));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useSEO({ title: "Company Profile | OXEN Consulting", description: "Manage your consulting company profile." });

  // Sync form when company loads/changes
  useEffect(() => {
    if (!editing) setForm(formFromCompany(company));
  }, [company, editing]);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key as string];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Company name is required.";
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email))
      e.contact_email = "Enter a valid email.";
    if (form.contact_phone && form.contact_phone.replace(/\D/g, "").length < 7)
      e.contact_phone = "Enter a valid phone number.";
    if (form.website && !/^https?:\/\//i.test(form.website))
      e.website = "Website must start with http:// or https://";
    if (form.years_experience && (Number(form.years_experience) < 0 || Number.isNaN(Number(form.years_experience))))
      e.years_experience = "Enter a valid number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("No company");
      if (isTestMode) {
        // Test-mode: persist to localStorage snapshot so changes survive reload.
        try {
          const raw = localStorage.getItem("oxen.consulting.onboarding");
          if (raw) {
            const snap = JSON.parse(raw);
            snap.company = {
              ...snap.company,
              name: form.name,
              country: form.country,
              city: form.city,
              address: form.address,
              phone: form.contact_phone,
              email: form.contact_email,
              website: form.website || null,
              description: form.description,
              logoDataUrl: form.logo_url,
            };
            localStorage.setItem("oxen.consulting.onboarding", JSON.stringify(snap));
          }
        } catch {
          /* ignore */
        }
        // Also update the cached company so the shell updates immediately.
        queryClient.setQueryData(["consulting-company", "test-company-" + company.owner_id, company.owner_id], {
          ...company,
          name: form.name,
          description: form.description,
          country: form.country,
          city: form.city,
          address: form.address,
          contact_phone: form.contact_phone,
          contact_email: form.contact_email,
          website: form.website || null,
          working_hours: form.working_hours || null,
          supported_languages: form.supported_languages,
          destination_countries: form.destination_countries,
          years_experience: Number(form.years_experience) || 0,
          license_info: form.license_info || null,
          logo_url: form.logo_url || null,
          cover_image_url: form.cover_image_url || null,
          is_published: form.is_published,
          updated_at: new Date().toISOString(),
        });
        return;
      }
      const { error } = await updateCompanyProfile(company.id, {
        name: form.name,
        description: form.description || null,
        country: form.country || null,
        city: form.city || null,
        address: form.address || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        website: form.website || null,
        working_hours: form.working_hours || null,
        supported_languages: form.supported_languages,
        destination_countries: form.destination_countries,
        years_experience: Number(form.years_experience) || 0,
        license_info: form.license_info || null,
        logo_url: form.logo_url || null,
        cover_image_url: form.cover_image_url || null,
        is_published: form.is_published,
      });
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      toast({ title: "Profile saved", description: "Your company profile was updated." });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["consulting-company"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    saveMutation.mutate();
  };

  const handleCancel = () => {
    setForm(formFromCompany(company));
    setErrors({});
    setEditing(false);
  };

  const handleImage = async (file: File, kind: "logo" | "cover") => {
    if (!company) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 2 MB.", variant: "destructive" });
      return;
    }
    // Test-mode: read as data URL so it persists in localStorage.
    if (isTestMode) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        set(kind === "logo" ? "logo_url" : "cover_image_url", dataUrl);
      };
      reader.readAsDataURL(file);
      return;
    }
    const setter = kind === "logo" ? setUploadingLogo : setUploadingCover;
    setter(true);
    try {
      const url = await uploadConsultingAsset(file, `companies/${company.id}/${kind}-${Date.now()}`);
      if (url) {
        set(kind === "logo" ? "logo_url" : "cover_image_url", url);
        toast({ title: `${kind === "logo" ? "Logo" : "Cover"} uploaded` });
      } else {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    } finally {
      setter(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    set(
      "supported_languages",
      form.supported_languages.includes(lang)
        ? form.supported_languages.filter((l) => l !== lang)
        : [...form.supported_languages, lang],
    );
  };

  const toggleDestination = (code: string) => {
    set(
      "destination_countries",
      form.destination_countries.includes(code)
        ? form.destination_countries.filter((c) => c !== code)
        : [...form.destination_countries, code],
    );
  };

  const countryOptions = useMemo(
    () => [{ value: "", label: "Select country" }, ...COUNTRIES.map((c) => ({ value: c.name, label: c.name }))],
    [],
  );

  return (
    <DashboardShell
      title="Company Profile"
      subtitle="Public-facing business information"
      actions={
        editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1] disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="gold-gradient inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/consulting/company/${company?.id ?? ""}`)}
              disabled={!company}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1] disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5" /> Preview Public Profile
            </button>
            <button
              onClick={() => setEditing(true)}
              className="gold-gradient inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground transition active:scale-95"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        )
      }
    >
      {isTestMode && (
        <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/90">
          <span className="font-bold">Test Mode:</span> Profile changes are saved to your browser. Apply the
          Supabase migration to persist to the database.
        </div>
      )}

      {/* Cover + logo */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="glass mb-5 overflow-hidden rounded-3xl"
      >
        <div className="relative h-40 w-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent sm:h-52">
          {form.cover_image_url ? (
            <img src={form.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/40">
              <Building2 className="h-10 w-10" />
            </div>
          )}
          {editing && (
            <label className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80">
              {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Cover</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], "cover")}
              />
            </label>
          )}
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex items-end gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-card">
              {form.logo_url ? (
                <img src={form.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/15 text-primary">
                  <Building2 className="h-8 w-8" />
                </div>
              )}
            </div>
            {editing && (
              <label className="mb-1 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80">
                {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                <span className="ml-1.5">Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], "logo")}
                />
              </label>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {editing ? (
                <Field
                  label="Company name"
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  required
                  error={errors.name}
                />
              ) : (
                <h3 className="font-display text-xl font-extrabold text-foreground">{form.name || "Your company"}</h3>
              )}
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[form.city, form.country].filter(Boolean).join(", ") || "Location not set"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {form.is_published ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Published
                </span>
              ) : (
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  Unpublished
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fields */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.05 }}
        className="glass rounded-3xl p-5 sm:p-6"
      >
        <h4 className="mb-4 font-display text-sm font-bold text-foreground">Business information</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <>
              <Field
                label="Description"
                value={form.description}
                onChange={(v) => set("description", v)}
                type="textarea"
                placeholder="Tell clients about your consulting services…"
                className="sm:col-span-2"
              />
              <SelectField
                label="Country"
                value={form.country}
                onChange={(v) => set("country", v)}
                options={countryOptions}
              />
              <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
              <Field
                label="Address"
                value={form.address}
                onChange={(v) => set("address", v)}
                className="sm:col-span-2"
              />
              <Field
                label="Phone"
                value={form.contact_phone}
                onChange={(v) => set("contact_phone", v)}
                type="tel"
                error={errors.contact_phone}
              />
              <Field
                label="Email"
                value={form.contact_email}
                onChange={(v) => set("contact_email", v)}
                type="email"
                error={errors.contact_email}
              />
              <Field
                label="Website"
                value={form.website}
                onChange={(v) => set("website", v)}
                type="url"
                placeholder="https://yourcompany.com"
                error={errors.website}
                className="sm:col-span-2"
              />
              <Field
                label="Working hours"
                value={form.working_hours}
                onChange={(v) => set("working_hours", v)}
                placeholder="Mon–Fri 9:00–18:00"
                className="sm:col-span-2"
              />
              <Field
                label="Years of experience"
                value={form.years_experience}
                onChange={(v) => set("years_experience", v)}
                type="number"
                error={errors.years_experience}
              />
              <Field
                label="License information"
                value={form.license_info}
                onChange={(v) => set("license_info", v)}
                placeholder="License #, accreditation, regulator…"
                className="sm:col-span-2"
              />

              {/* Supported languages */}
              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">
                  Supported languages
                </span>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const on = form.supported_languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          on
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/[0.06] text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Destination countries */}
              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">
                  Destination countries
                </span>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.slice(0, 30).map((c) => {
                    const on = form.destination_countries.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleDestination(c.name)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          on
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/[0.06] text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Publish toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.03] p-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => set("is_published", !form.is_published)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition",
                    form.is_published ? "bg-primary" : "bg-white/[0.12]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                      form.is_published ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
                <div>
                  <p className="text-sm font-semibold text-foreground">Publish public profile</p>
                  <p className="text-xs text-muted-foreground">
                    When on, your profile is visible at /consulting/company/&lt;id&gt;.
                  </p>
                </div>
              </label>
            </>
          ) : (
            <ReadOnlyGrid form={form} />
          )}
        </div>
      </motion.div>
    </DashboardShell>
  );
}

function ReadOnlyGrid({ form }: { form: ProfileForm }) {
  const rows: { icon: typeof Globe; label: string; value: string }[] = [
    { icon: FileText, label: "Description", value: form.description || "—" },
    { icon: MapPin, label: "Country", value: form.country || "—" },
    { icon: MapPin, label: "City", value: form.city || "—" },
    { icon: MapPin, label: "Address", value: form.address || "—" },
    { icon: Phone, label: "Phone", value: form.contact_phone || "—" },
    { icon: Mail, label: "Email", value: form.contact_email || "—" },
    { icon: Globe, label: "Website", value: form.website || "—" },
    { icon: Clock, label: "Working hours", value: form.working_hours || "—" },
    { icon: Award, label: "Years of experience", value: form.years_experience || "0" },
    { icon: FileText, label: "License information", value: form.license_info || "—" },
    {
      icon: Languages,
      label: "Supported languages",
      value: form.supported_languages.length ? form.supported_languages.join(", ") : "—",
    },
    {
      icon: Plane,
      label: "Destination countries",
      value: form.destination_countries.length ? form.destination_countries.join(", ") : "—",
    },
  ];
  return (
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
  );
}
