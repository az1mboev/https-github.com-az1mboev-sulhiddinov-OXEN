import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
  upsertPackage,
  deletePackage,
  uploadConsultingAsset,
  type ConsultingPackage,
} from "@/lib/consulting";
import {
  createService,
  updateService,
  type Service,
} from "@/lib/services";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "RUB", "UZS", "JPY"];

export default function ConsultingPackages() {
  const { company, can } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ConsultingPackage | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConsultingPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  useSEO({ title: "Service Packages | OXEN Consulting", description: "Manage your service packages" });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["consulting-packages", companyId],
    queryFn: () => fetchCompanyPackages(companyId),
    enabled: !!companyId,
  });

  const canWrite = can("packages:write");

  const filtered = useMemo(
    () =>
      packages.filter((p) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          p.service?.title?.toLowerCase().includes(q) ||
          p.destination_country?.toLowerCase().includes(q) ||
          p.service?.category?.toLowerCase().includes(q)
        );
      }),
    [packages, search],
  );

  const togglePublish = useMutation({
    mutationFn: async (pkg: ConsultingPackage) => {
      await upsertPackage(
        companyId,
        pkg.service_id ?? "",
        { is_published: !pkg.is_published },
        user?.id ?? "",
        pkg.id,
      );
    },
    onSuccess: () => {
      toast({ title: "Package updated" });
      queryClient.invalidateQueries({ queryKey: ["consulting-packages"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const duplicate = useMutation({
    mutationFn: async (pkg: ConsultingPackage) => {
      if (!pkg.service_id) throw new Error("Package has no linked service");
      // Create a new service as a copy
      const copy = await createService(companyId, {
        title: `${pkg.service?.title ?? "Package"} (Copy)`,
        description: pkg.service?.description ?? "",
        category: pkg.service?.category ?? "General",
        price: pkg.service?.price ?? 0,
        currency: pkg.service?.currency ?? "USD",
        is_active: false,
      } as Partial<Service>);
      if (!copy) throw new Error("Failed to duplicate service");
      await upsertPackage(
        companyId,
        copy.id,
        {
          destination_country: pkg.destination_country,
          estimated_processing_time: pkg.estimated_processing_time,
          included_services: pkg.included_services,
          required_documents: pkg.required_documents,
          what_client_receives: pkg.what_client_receives,
          who_this_is_for: pkg.who_this_is_for,
          refund_conditions: pkg.refund_conditions,
          contact_info: pkg.contact_info,
          available_slots: pkg.available_slots,
          faq: pkg.faq,
          is_published: false,
        },
        user?.id ?? "",
      );
    },
    onSuccess: () => {
      toast({ title: "Package duplicated" });
      queryClient.invalidateQueries({ queryKey: ["consulting-packages"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No packages yet"
          description="Create your first service package to start accepting clients. Include pricing, requirements, documents, and FAQ."
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
                    ${Number(pkg.service?.price ?? 0).toLocaleString()}
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
                {pkg.service &&
                  (pkg.service as { rating?: number } | undefined)?.rating !== undefined &&
                  ((pkg.service as { rating?: number } | undefined)?.rating ?? 0) > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    {((pkg.service as { rating?: number }).rating ?? 0).toFixed(1)}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3">
                  <button
                    onClick={() => pkg.service_id && window.open(`/services/${pkg.service_id}`, "_blank")}
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
          initial={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["consulting-packages"] });
            queryClient.invalidateQueries({ queryKey: ["services"] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete package"
        message={`Delete "${deleteTarget?.service?.title ?? "this package"}"? This cannot be undone. The linked service will also be removed.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            // Delete the consulting_package row; the service stays unless explicitly removed
            const ok = await deletePackage(deleteTarget.id);
            if (!ok) throw new Error("Failed");
            if (deleteTarget.service_id) {
              // Also remove the linked service (cascade-like behavior)
              await supabaseRemoveService(deleteTarget.service_id);
            }
            toast({ title: "Package deleted" });
            setDeleteTarget(null);
            queryClient.invalidateQueries({ queryKey: ["consulting-packages"] });
            queryClient.invalidateQueries({ queryKey: ["services"] });
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

// Tiny helper to delete the linked service row
async function supabaseRemoveService(serviceId: string): Promise<void> {
  const { supabase } = await import("@/lib/supabase");
  const { error } = await supabase.from("services").delete().eq("id", serviceId);
  if (error) console.error("removeService error:", error);
}

/* ── Package editor modal ────────────────────────────────── */

interface PackageFormState {
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  duration: string;
  cover_image: string;
  destination_country: string;
  estimated_processing_time: string;
  included_services: string[];
  required_documents: string[];
  what_client_receives: string[];
  who_this_is_for: string;
  refund_conditions: string;
  available_slots: string;
  is_published: boolean;
}

const EMPTY_FORM: PackageFormState = {
  title: "",
  description: "",
  category: "General",
  price: 0,
  currency: "USD",
  duration: "",
  cover_image: "",
  destination_country: "",
  estimated_processing_time: "",
  included_services: [],
  required_documents: [],
  what_client_receives: [],
  who_this_is_for: "",
  refund_conditions: "",
  available_slots: "",
  is_published: false,
};

function PackageEditorModal({
  companyId,
  initial,
  onClose,
  onSaved,
}: {
  companyId: string;
  initial?: ConsultingPackage;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<PackageFormState>(() => {
    if (!initial) return EMPTY_FORM;
    return {
      title: initial.service?.title ?? "",
      description: initial.service?.description ?? "",
      category: initial.service?.category ?? "General",
      price: initial.service?.price ?? 0,
      currency: initial.service?.currency ?? "USD",
      duration: "",
      cover_image: initial.service?.cover_image ?? "",
      destination_country: initial.destination_country ?? "",
      estimated_processing_time: initial.estimated_processing_time ?? "",
      included_services: Array.isArray(initial.included_services) ? (initial.included_services as unknown as string[]) : [],
      required_documents: Array.isArray(initial.required_documents) ? (initial.required_documents as unknown as string[]) : [],
      what_client_receives: Array.isArray(initial.what_client_receives) ? (initial.what_client_receives as unknown as string[]) : [],
      who_this_is_for: initial.who_this_is_for ?? "",
      refund_conditions: initial.refund_conditions ?? "",
      available_slots: initial.available_slots?.toString() ?? "",
      is_published: initial.is_published,
    };
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = useCallback(<K extends keyof PackageFormState>(k: K, v: PackageFormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const handleCoverUpload = useCallback(async (file: File) => {
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
  }, [set]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let serviceId = initial?.service_id ?? null;

      const servicePayload: Partial<Service> = {
        title: form.title,
        description: form.description,
        category: form.category,
        price: form.price,
        currency: form.currency,
        duration: form.duration || null,
        cover_image: form.cover_image || null,
        is_active: true,
      };

      if (serviceId) {
        await updateService(serviceId, servicePayload);
      } else {
        const svc = await createService(companyId, servicePayload);
        if (!svc) throw new Error("Failed to create service");
        serviceId = svc.id;
      }

      await upsertPackage(
        companyId,
        serviceId,
        {
          destination_country: form.destination_country || null,
          estimated_processing_time: form.estimated_processing_time || null,
          included_services: form.included_services,
          required_documents: form.required_documents,
          what_client_receives: form.what_client_receives,
          who_this_is_for: form.who_this_is_for || null,
          refund_conditions: form.refund_conditions || null,
          available_slots: form.available_slots ? parseInt(form.available_slots, 10) : null,
          is_published: form.is_published,
        },
        user?.id ?? "",
        initial?.id,
      );

      toast({ title: "Package saved" });
      onSaved();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [form, initial, companyId, user, onSaved]);

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
        className="fixed inset-y-0 right-0 z-[81] flex w-full max-w-xl flex-col bg-sidebar/95 backdrop-blur-xl shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="font-display text-lg font-bold">{initial ? "Edit Package" : "New Package"}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Cover */}
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
          <Field label="Short description" value={form.description} onChange={(v) => set("description", v)} type="textarea" placeholder="A complete visa application service for students…" />

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Price" type="number" value={String(form.price)} onChange={(v) => set("price", parseFloat(v) || 0)} />
            <SelectField<string>
              label="Currency"
              value={form.currency}
              onChange={(v) => set("currency", v)}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            <Field label="Duration" value={form.duration} onChange={(v) => set("duration", v)} placeholder="e.g. 60 days" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category" value={form.category} onChange={(v) => set("category", v)} placeholder="Visa, Travel, Education" />
            <Field label="Destination country" value={form.destination_country} onChange={(v) => set("destination_country", v)} placeholder="Canada" />
          </div>

          <Field label="Estimated processing time" value={form.estimated_processing_time} onChange={(v) => set("estimated_processing_time", v)} placeholder="8–12 weeks" />

          <ListEditor label="Included services" items={form.included_services} onChange={(items) => set("included_services", items)} placeholder="Document review" />
          <ListEditor label="Required documents" items={form.required_documents} onChange={(items) => set("required_documents", items)} placeholder="Passport copy" />
          <ListEditor label="What the client receives" items={form.what_client_receives} onChange={(items) => set("what_client_receives", items)} placeholder="Approved visa" />

          <Field label="Who this package is for" value={form.who_this_is_for} onChange={(v) => set("who_this_is_for", v)} placeholder="Students applying to Canadian universities" />
          <Field label="Refund conditions" value={form.refund_conditions} onChange={(v) => set("refund_conditions", v)} type="textarea" placeholder="Full refund if application is rejected due to our error…" />
          <Field label="Available slots" type="number" value={form.available_slots} onChange={(v) => set("available_slots", v)} placeholder="Unlimited" />

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
