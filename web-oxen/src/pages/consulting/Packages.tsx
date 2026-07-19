import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Package as PackageIcon,
  Plus,
  Search,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Edit3,
  ExternalLink,
  X,
  Loader2,
  Save,
  Upload,
  Star,
  ImageIcon,
  Video as VideoIcon,
  GripVertical,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchCompanyPackages,
  upsertPackage as apiUpsertPackage,
  deletePackage as apiDeletePackage,
  duplicatePackage as apiDuplicatePackage,
  setPackagePublished as apiSetPackagePublished,
  uploadConsultingAsset,
  type ConsultingPackage,
} from "@/lib/consulting";
import {
  testFetchPackages,
  testUpsertPackage,
  testDeletePackage,
  testDuplicatePackage,
  testSetPackagePublished,
  type TestPackageInput,
} from "@/lib/consulting-test-mode";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "RUB", "UZS", "JPY"] as const;
const CATEGORIES = ["Visa", "Travel", "Education", "Immigration", "Business", "Tourism", "Consultation", "General"] as const;

/* ────────────────────────────────────────────────────────────
   Package form state — mirrors all 19 spec fields
   ──────────────────────────────────────────────────────────── */
interface PackageFormState {
  title: string;
  category: string;
  destination_country: string;
  price: string;
  currency: string;
  duration: string;
  estimated_processing_time: string;
  description: string;
  long_description: string;
  cover_image: string;
  gallery: string[];
  video_url: string;
  included_services: string[];
  requirements: string[];
  required_documents: string[];
  benefits: string[];
  who_this_is_for: string;
  refund_conditions: string;
  faq: { question: string; answer: string }[];
  available_slots: string;
  is_published: boolean;
}

const EMPTY_FORM: PackageFormState = {
  title: "",
  category: "General",
  destination_country: "",
  price: "0",
  currency: "USD",
  duration: "",
  estimated_processing_time: "",
  description: "",
  long_description: "",
  cover_image: "",
  gallery: [],
  video_url: "",
  included_services: [],
  requirements: [],
  required_documents: [],
  benefits: [],
  who_this_is_for: "",
  refund_conditions: "",
  faq: [],
  available_slots: "",
  is_published: false,
};

function formFromPackage(pkg: ConsultingPackage): PackageFormState {
  const contact = pkg.contact_info as { video_url?: string; long_description?: string } | null;
  return {
    title: pkg.service?.title ?? "",
    category: pkg.service?.category ?? "General",
    destination_country: pkg.destination_country ?? "",
    price: String(pkg.service?.price ?? 0),
    currency: pkg.service?.currency ?? "USD",
    duration: "",
    estimated_processing_time: pkg.estimated_processing_time ?? "",
    description: pkg.service?.description ?? "",
    long_description: contact?.long_description ?? "",
    cover_image: pkg.service?.cover_image ?? "",
    gallery: [],
    video_url: contact?.video_url ?? "",
    included_services: (pkg.included_services as unknown as string[]) ?? [],
    requirements: [],
    required_documents: (pkg.required_documents as unknown as string[]) ?? [],
    benefits: (pkg.what_client_receives as unknown as string[]) ?? [],
    who_this_is_for: pkg.who_this_is_for ?? "",
    refund_conditions: pkg.refund_conditions ?? "",
    faq: (pkg.faq as unknown as { question: string; answer: string }[]) ?? [],
    available_slots: pkg.available_slots?.toString() ?? "",
    is_published: pkg.is_published,
  };
}

function formToTestInput(form: PackageFormState): TestPackageInput {
  return {
    title: form.title,
    description: form.description,
    category: form.category,
    destination_country: form.destination_country,
    price: parseFloat(form.price) || 0,
    currency: form.currency,
    duration: form.duration,
    estimated_processing_time: form.estimated_processing_time,
    long_description: form.long_description,
    cover_image: form.cover_image,
    gallery: form.gallery,
    video_url: form.video_url,
    included_services: form.included_services,
    requirements: form.requirements,
    required_documents: form.required_documents,
    benefits: form.benefits,
    who_this_is_for: form.who_this_is_for,
    refund_conditions: form.refund_conditions,
    faq: form.faq,
    available_slots: form.available_slots,
    is_published: form.is_published,
  };
}

export default function ConsultingPackages() {
  const { company, can, isTestMode } = useConsulting();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ConsultingPackage | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConsultingPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  useSEO({ title: "Service Packages | OXEN Consulting", description: "Manage your service packages" });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["consulting-packages", companyId, isTestMode],
    queryFn: () => testFetchPackages(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });

  const { data: realPackages = [], isLoading: realLoading } = useQuery({
    queryKey: ["consulting-packages", companyId],
    queryFn: () => fetchCompanyPackages(companyId),
    enabled: !!companyId && !isTestMode,
  });

  const allPackages = isTestMode ? packages : realPackages;
  const loading = isTestMode ? isLoading : realLoading;

  const canWrite = can("packages:write");

  const filtered = useMemo(
    () =>
      allPackages.filter((p) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          p.service?.title?.toLowerCase().includes(q) ||
          p.destination_country?.toLowerCase().includes(q) ||
          p.service?.category?.toLowerCase().includes(q)
        );
      }),
    [allPackages, search],
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["consulting-packages"] });
  }, [queryClient]);

  const togglePublish = useMutation({
    mutationFn: async (pkg: ConsultingPackage) => {
      if (isTestMode) {
        return testSetPackagePublished(companyId, pkg.id, !pkg.is_published);
      }
      return apiSetPackagePublished(pkg.id, !pkg.is_published);
    },
    onSuccess: () => {
      toast({ title: "Package updated" });
      invalidate();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const duplicate = useMutation({
    mutationFn: async (pkg: ConsultingPackage) => {
      if (isTestMode) return testDuplicatePackage(companyId, pkg, user?.id ?? "");
      return apiDuplicatePackage(pkg, companyId, user?.id ?? "");
    },
    onSuccess: () => {
      toast({ title: "Package duplicated" });
      invalidate();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const previewPackage = (pkg: ConsultingPackage) => {
    navigate(`/consulting/package/${pkg.id}`);
  };

  return (
    <DashboardShell
      title="Service Packages"
      subtitle="Create and manage the service packages your consulting company offers"
      actions={
        canWrite && (
          <button
            onClick={() => setCreating(true)}
            className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Package
          </button>
        )
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages…"
            className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No packages yet"
          description="Create your first service package to start accepting clients. Include pricing, requirements, documents, gallery, video, and FAQ."
          action={canWrite ? { label: "Create package", onClick: () => setCreating(true) } : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="glass flex flex-col overflow-hidden rounded-2xl"
            >
              <div className="relative h-32 w-full overflow-hidden bg-white/[0.03]">
                {pkg.service?.cover_image ? (
                  <img
                    src={pkg.service.cover_image}
                    alt={pkg.service.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <PackageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute right-2 top-2 flex gap-1.5">
                  {pkg.is_published ? (
                    <StatusBadge status="active" label="Published" />
                  ) : (
                    <StatusBadge status="none" label="Draft" />
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="truncate font-display text-sm font-bold text-foreground">
                  {pkg.service?.title ?? "Untitled"}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                  {pkg.service?.description ?? "No description"}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-display font-bold text-primary">
                    {pkg.service?.currency ?? "USD"} {Number(pkg.service?.price ?? 0).toLocaleString()}
                  </span>
                  <span>·</span>
                  <span>{pkg.service?.category ?? "General"}</span>
                  {pkg.destination_country && (
                    <>
                      <span>·</span>
                      <span>{pkg.destination_country}</span>
                    </>
                  )}
                </div>
                {pkg.available_slots != null && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {pkg.available_slots > 0 ? `${pkg.available_slots} slots available` : "Unlimited slots"}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3">
                  <button
                    onClick={() => previewPackage(pkg)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
                    aria-label="Preview"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  {canWrite && (
                    <>
                      <button
                        onClick={() => setEditing(pkg)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20"
                        aria-label="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => togglePublish.mutate(pkg)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
                        aria-label={pkg.is_published ? "Unpublish" : "Publish"}
                      >
                        {pkg.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => duplicate.mutate(pkg)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
                        aria-label="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(pkg)}
                        className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PackageEditorModal
          companyId={companyId}
          isTestMode={isTestMode}
          initial={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            invalidate();
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete package"
        message={`Delete "${deleteTarget?.service?.title ?? "this package"}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            const ok = isTestMode
              ? testDeletePackage(companyId, deleteTarget.id)
              : await apiDeletePackage(deleteTarget.id);
            if (!ok) throw new Error("Failed");
            toast({ title: "Package deleted" });
            setDeleteTarget(null);
            invalidate();
          } catch {
            toast({ title: "Failed to delete", variant: "destructive" });
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}

/* ── Package editor modal (all 19 fields) ────────────────── */

function PackageEditorModal({
  companyId,
  isTestMode,
  initial,
  onClose,
  onSaved,
}: {
  companyId: string;
  isTestMode: boolean;
  initial?: ConsultingPackage;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<PackageFormState>(() =>
    initial ? formFromPackage(initial) : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const set = useCallback(<K extends keyof PackageFormState>(k: K, v: PackageFormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const handleCoverUpload = useCallback(
    async (file: File) => {
      if (isTestMode) {
        // data URL in test mode
        const reader = new FileReader();
        reader.onload = () => {
          set("cover_image", String(reader.result ?? ""));
          toast({ title: "Cover added" });
        };
        reader.readAsDataURL(file);
        return;
      }
      setUploading(true);
      try {
        const url = await uploadConsultingAsset(file, `packages/${Date.now()}_${file.name}`);
        if (url) {
          set("cover_image", url);
          toast({ title: "Cover uploaded" });
        } else {
          toast({ title: "Upload failed", variant: "destructive" });
        }
      } finally {
        setUploading(false);
      }
    },
    [set, isTestMode],
  );

  const handleGalleryUpload = useCallback(
    async (files: FileList) => {
      const fileArr = Array.from(files);
      if (isTestMode) {
        const promises = fileArr.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result ?? ""));
              reader.readAsDataURL(file);
            }),
        );
        const urls = await Promise.all(promises);
        set("gallery", [...form.gallery, ...urls]);
        toast({ title: `${urls.length} image(s) added` });
        return;
      }
      setGalleryUploading(true);
      try {
        const urls: string[] = [];
        for (const file of fileArr) {
          const url = await uploadConsultingAsset(file, `packages/gallery/${Date.now()}_${file.name}`);
          if (url) urls.push(url);
        }
        set("gallery", [...form.gallery, ...urls]);
        toast({ title: `${urls.length} image(s) uploaded` });
      } finally {
        setGalleryUploading(false);
      }
    },
    [form.gallery, set, isTestMode],
  );

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast({ title: "Package name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (isTestMode) {
        testUpsertPackage(companyId, formToTestInput(form), user?.id ?? "", initial?.id);
      } else {
        // Real Supabase mode — upsert package with extended fields stored on contact_info
        await apiUpsertPackage(
          companyId,
          initial?.service_id ?? "",
          {
            destination_country: form.destination_country || null,
            estimated_processing_time: form.estimated_processing_time || null,
            included_services: form.included_services as unknown as never,
            required_documents: form.required_documents as unknown as never,
            what_client_receives: form.benefits as unknown as never,
            who_this_is_for: form.who_this_is_for || null,
            refund_conditions: form.refund_conditions || null,
            contact_info: { video_url: form.video_url || null, long_description: form.long_description || null } as unknown as never,
            available_slots: form.available_slots ? parseInt(form.available_slots, 10) : null,
            faq: form.faq as unknown as never,
            is_published: form.is_published,
          },
          user?.id ?? "",
          initial?.id,
        );
      }
      toast({ title: "Package saved" });
      onSaved();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [form, initial, companyId, user, onSaved, isTestMode]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed inset-y-0 right-0 z-[81] flex w-full max-w-2xl flex-col bg-sidebar/95 backdrop-blur-xl shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-bold">
              {initial ? "Edit Package" : "New Package"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isTestMode ? "Test mode — saved locally" : "Saved to your company account"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Cover image */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Cover image</span>
            <div className="relative h-32 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              {form.cover_image ? (
                <img src={form.cover_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <PackageIcon className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
              <label className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[10px] font-semibold text-foreground backdrop-blur-md transition hover:bg-black/80">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCoverUpload(f);
                  }}
                />
              </label>
            </div>
          </div>

          <Field label="Package name" value={form.title} onChange={(v) => set("title", v)} placeholder="Canada Student Visa Package" required />

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField<string>
              label="Category"
              value={form.category}
              onChange={(v) => set("category", v)}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <SelectField<string>
              label="Destination country"
              value={form.destination_country}
              onChange={(v) => set("destination_country", v)}
              options={[{ value: "", label: "None" }, ...COUNTRIES.map((c) => ({ value: c.name, label: c.name }))]}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Price" type="number" value={form.price} onChange={(v) => set("price", v)} placeholder="0" />
            <SelectField<string>
              label="Currency"
              value={form.currency}
              onChange={(v) => set("currency", v)}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            <Field label="Duration" value={form.duration} onChange={(v) => set("duration", v)} placeholder="e.g. 60 days" />
          </div>

          <Field
            label="Estimated processing time"
            value={form.estimated_processing_time}
            onChange={(v) => set("estimated_processing_time", v)}
            placeholder="8–12 weeks"
          />

          <Field
            label="Short description"
            value={form.description}
            onChange={(v) => set("description", v)}
            type="textarea"
            placeholder="A complete visa application service for students…"
          />

          <Field
            label="Full description"
            value={form.long_description}
            onChange={(v) => set("long_description", v)}
            type="textarea"
            placeholder="Detailed description of what's included, the process, timelines…"
          />

          {/* Image gallery */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Image gallery</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {form.gallery.map((url, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => set("gallery", form.gallery.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                {galleryUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-[9px] font-semibold">Add</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) handleGalleryUpload(e.target.files);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Video */}
          <Field
            label="Video URL (YouTube or MP4)"
            value={form.video_url}
            onChange={(v) => set("video_url", v)}
            type="url"
            placeholder="https://youtube.com/watch?v=…"
          />

          <ListEditor
            label="Included services"
            items={form.included_services}
            onChange={(items) => set("included_services", items)}
            placeholder="Document review"
          />
          <ListEditor
            label="Requirements"
            items={form.requirements}
            onChange={(items) => set("requirements", items)}
            placeholder="Valid passport"
          />
          <ListEditor
            label="Required documents"
            items={form.required_documents}
            onChange={(items) => set("required_documents", items)}
            placeholder="Passport copy"
          />
          <ListEditor
            label="Benefits / What client receives"
            items={form.benefits}
            onChange={(items) => set("benefits", items)}
            placeholder="Approved visa"
          />

          <Field
            label="Who this package is for"
            value={form.who_this_is_for}
            onChange={(v) => set("who_this_is_for", v)}
            placeholder="Students applying to Canadian universities"
          />

          <Field
            label="Refund conditions"
            value={form.refund_conditions}
            onChange={(v) => set("refund_conditions", v)}
            type="textarea"
            placeholder="Full refund if application is rejected due to our error…"
          />

          <Field
            label="Available slots (blank = unlimited)"
            type="number"
            value={form.available_slots}
            onChange={(v) => set("available_slots", v)}
            placeholder="Unlimited"
          />

          {/* FAQ editor */}
          <FaqEditor items={form.faq} onChange={(items) => set("faq", items)} />

          {/* Active toggle */}
          <label className="glass flex items-center justify-between rounded-2xl p-4">
            <div>
              <p className="text-sm font-semibold">Published</p>
              <p className="text-xs text-muted-foreground">When published, this package is visible to the public.</p>
            </div>
            <button
              type="button"
              onClick={() => set("is_published", !form.is_published)}
              className={cn(
                "relative h-7 w-12 rounded-full transition",
                form.is_published ? "bg-primary" : "bg-muted",
              )}
            >
              <motion.span
                animate={{ x: form.is_published ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
              />
            </button>
          </label>
        </div>

        <footer className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
          <button
            onClick={onClose}
            className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {initial ? "Save Changes" : "Create Package"}
          </button>
        </footer>
      </motion.div>
    </>
  );
}

/* ── Reusable list editor ─────────────────────────────────── */

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className="flex-1 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, ""])}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:opacity-80"
        >
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      </div>
    </div>
  );
}

/* ── FAQ editor ──────────────────────────────────────────── */

function FaqEditor({
  items,
  onChange,
}: {
  items: { question: string; answer: string }[];
  onChange: (items: { question: string; answer: string }[]) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">FAQ</span>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={item.question}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], question: e.target.value };
                  onChange(next);
                }}
                placeholder="Question"
                className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm font-semibold focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              value={item.answer}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], answer: e.target.value };
                onChange(next);
              }}
              placeholder="Answer"
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        ))}
        <button
          onClick={() => onChange([...items, { question: "", answer: "" }])}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:opacity-80"
        >
          <Plus className="h-3.5 w-3.5" /> Add FAQ
        </button>
      </div>
    </div>
  );
}
