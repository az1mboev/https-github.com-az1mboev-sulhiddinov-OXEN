import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Download,
  Trash2,
  Archive,
  MessageSquare,
  StickyNote,
  CheckSquare,
  Mail,
  Phone,
  Loader2,
  X,
  Edit3,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { DataTable, type Column } from "@/components/consulting/DataTable";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { EmptyState } from "@/components/consulting/EmptyState";
import { SlideOver } from "@/components/consulting/SlideOver";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchClients,
  fetchClientById,
  fetchClientNotes,
  fetchMembers,
  createClient,
  updateClient,
  archiveClient,
  addClientNote,
  type ConsultingClient,
  type ClientApplicationStatus,
  type FinalResult,
  type PaymentStatus,
} from "@/lib/consulting";
import { cn } from "@/lib/utils";

const CLIENT_STATUSES: { value: ClientApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "consultation_scheduled", label: "Consultation Scheduled" },
  { value: "documents_requested", label: "Documents Requested" },
  { value: "documents_received", label: "Documents Received" },
  { value: "under_review", label: "Under Review" },
  { value: "submitted", label: "Submitted" },
  { value: "waiting_for_result", label: "Waiting for Result" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "travel_completed", label: "Travel Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

interface AddClientInput {
  full_name: string;
  phone: string;
  email: string;
  destination_country: string;
  assigned_employee_id: string;
  application_status: ClientApplicationStatus;
  payment_status: PaymentStatus;
  final_result: FinalResult;
}

export default function ConsultingClients() {
  const { company, can } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientApplicationStatus | "all">("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ConsultingClient | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ConsultingClient | null>(null);
  const [archiving, setArchiving] = useState(false);

  useSEO({ title: "Clients | OXEN Consulting", description: "Manage your consulting clients" });

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["consulting-clients", companyId, search, statusFilter, employeeFilter, page],
    queryFn: () =>
      fetchClients(companyId, {
        search: search.trim() || undefined,
        status: statusFilter,
        employeeId: employeeFilter === "all" ? undefined : employeeFilter,
        page,
        pageSize: 20,
      }),
    enabled: !!companyId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["consulting-members", companyId],
    queryFn: () => fetchMembers(companyId),
    enabled: !!companyId,
  });

  const { data: profile } = useQuery({
    queryKey: ["consulting-client", profileId],
    queryFn: () => fetchClientById(profileId!),
    enabled: !!profileId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["consulting-client-notes", profileId],
    queryFn: () => fetchClientNotes(profileId!),
    enabled: !!profileId,
  });

  const canWrite = can("clients:write");

  // ── Mutations ────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: (input: AddClientInput) =>
      createClient(companyId, input, user?.id ?? ""),
    onSuccess: () => {
      toast({ title: "Client added" });
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["consulting-clients"] });
      queryClient.invalidateQueries({ queryKey: ["consulting-stats"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ConsultingClient> }) =>
      updateClient(id, input),
    onSuccess: () => {
      toast({ title: "Client updated" });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["consulting-clients"] });
      queryClient.invalidateQueries({ queryKey: ["consulting-client"] });
      queryClient.invalidateQueries({ queryKey: ["consulting-stats"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      archiveClient(id, archive),
    onSuccess: () => {
      toast({ title: archiveTarget?.is_archived ? "Client restored" : "Client archived" });
      setArchiveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["consulting-clients"] });
    },
    onError: () => toast({ title: "Failed to archive", variant: "destructive" }),
  });

  // ── Export CSV ────────────────────────────────────────────

  const exportCsv = useCallback(() => {
    const rows = clientsData?.clients ?? [];
    if (rows.length === 0) {
      toast({ title: "No clients to export", variant: "destructive" });
      return;
    }
    const header = [
      "Full Name", "Phone", "Email", "Destination", "Assigned Employee",
      "Purchase Date", "Payment Status", "Application Status", "Final Result", "Last Activity",
    ];
    const lines = rows.map((r) =>
      [
        r.full_name,
        r.phone ?? "",
        r.email ?? "",
        r.destination_country ?? "",
        r.assigned_employee?.name ?? "",
        r.purchase_date ?? "",
        r.payment_status,
        r.application_status,
        r.final_result,
        r.last_activity_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxen-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  }, [clientsData]);

  // ── Columns ──────────────────────────────────────────────

  const columns: Column<ConsultingClient>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Client",
        render: (c) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
              {c.photo_url ? (
                <img src={c.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {c.full_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{c.full_name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{c.email ?? c.phone ?? "—"}</p>
            </div>
          </div>
        ),
      },
      {
        key: "package",
        header: "Package",
        hideOnMobile: true,
        render: (c) => <span className="text-xs text-foreground">{c.service?.title ?? "—"}</span>,
      },
      {
        key: "destination",
        header: "Destination",
        hideOnMobile: true,
        render: (c) => <span className="text-xs text-foreground">{c.destination_country ?? "—"}</span>,
      },
      {
        key: "employee",
        header: "Employee",
        hideOnMobile: true,
        render: (c) => (
          <span className="text-xs text-foreground">{c.assigned_employee?.name ?? "Unassigned"}</span>
        ),
      },
      {
        key: "payment",
        header: "Payment",
        render: (c) => <StatusBadge status={c.payment_status} />,
      },
      {
        key: "app_status",
        header: "Application",
        render: (c) => <StatusBadge status={c.application_status} />,
      },
      {
        key: "result",
        header: "Result",
        hideOnMobile: true,
        render: (c) => <StatusBadge status={c.final_result} />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (c) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProfileId(c.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
              aria-label="View profile"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            {canWrite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(c);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20"
                aria-label="Edit"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            {canWrite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setArchiveTarget(c);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                aria-label="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canWrite],
  );

  return (
    <DashboardShell
      title="Clients"
      subtitle="People who purchased your services or contacted your company"
      actions={
        canWrite && (
          <button
            onClick={() => setAddOpen(true)}
            className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        )
      }
    >
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, phone…"
            className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ClientApplicationStatus | "all");
            setPage(1);
          }}
          className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          {CLIENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={employeeFilter}
          onChange={(e) => {
            setEmployeeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">All employees</option>
          {members.map((m) => (
            <option key={m.id} value={m.user_id}>
              {m.profile?.name ?? "User"}
            </option>
          ))}
        </select>
        <button
          onClick={exportCsv}
          className="glass flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground transition hover:border-primary/30"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
      </motion.div>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={clientsData?.clients ?? []}
        rowKey={(c) => c.id}
        onRowClick={(c) => setProfileId(c.id)}
        loading={isLoading}
        empty={
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="When users purchase your service packages or contact your company, they'll appear here. You can also add clients manually."
            action={canWrite ? { label: "Add your first client", onClick: () => setAddOpen(true) } : undefined}
          />
        }
        pagination={
          clientsData && clientsData.total > 20
            ? {
                page,
                pageSize: 20,
                total: clientsData.total,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Add/Edit modal */}
      {(addOpen || editing) && (
        <ClientFormModal
          initial={editing ?? undefined}
          members={members}
          onClose={() => {
            setAddOpen(false);
            setEditing(null);
          }}
          onSubmit={(input) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, input });
            } else {
              addMutation.mutate(input);
            }
          }}
          loading={addMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Profile slide-over */}
      <SlideOver
        open={!!profileId}
        onClose={() => setProfileId(null)}
        title={profile?.full_name ?? "Client"}
        subtitle={profile?.email ?? undefined}
      >
        {profile && (
          <ClientProfileBody
            client={profile}
            notes={notes}
            canWrite={canWrite}
            currentUserId={user?.id ?? ""}
            onAddNote={async (body) => {
              await addClientNote(companyId, profile.id, user?.id ?? "", body, true);
              queryClient.invalidateQueries({ queryKey: ["consulting-client-notes", profile.id] });
              toast({ title: "Note added" });
            }}
          />
        )}
      </SlideOver>

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.is_archived ? "Restore client" : "Archive client"}
        message={
          archiveTarget?.is_archived
            ? `Restore ${archiveTarget?.full_name}? They'll reappear in your active list.`
            : `Archive ${archiveTarget?.full_name}? They'll be hidden from the active list but their data is preserved.`
        }
        confirmLabel={archiveTarget?.is_archived ? "Restore" : "Archive"}
        destructive={!archiveTarget?.is_archived}
        loading={archiving}
        onConfirm={async () => {
          if (!archiveTarget) return;
          setArchiving(true);
          try {
            await archiveClient(archiveTarget.id, !archiveTarget.is_archived);
            toast({ title: archiveTarget.is_archived ? "Client restored" : "Client archived" });
            setArchiveTarget(null);
            queryClient.invalidateQueries({ queryKey: ["consulting-clients"] });
          } catch {
            toast({ title: "Failed", variant: "destructive" });
          } finally {
            setArchiving(false);
          }
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </DashboardShell>
  );
}

/* ── Add/Edit modal ──────────────────────────────────────── */

function ClientFormModal({
  initial,
  members,
  onClose,
  onSubmit,
  loading,
}: {
  initial?: ConsultingClient;
  members: { user_id: string; profile?: { name: string | null } | null }[];
  onClose: () => void;
  onSubmit: (input: AddClientInput) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<AddClientInput>({
    full_name: initial?.full_name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    destination_country: initial?.destination_country ?? "",
    assigned_employee_id: initial?.assigned_employee_id ?? "",
    application_status: initial?.application_status ?? "new_lead",
    payment_status: initial?.payment_status ?? "pending",
    final_result: initial?.final_result ?? "pending",
  });

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
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">{initial ? "Edit Client" : "Add Client"}</h3>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <Field
              label="Full name"
              value={form.full_name}
              onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
              placeholder="John Smith"
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                type="tel"
                placeholder="+1 555 123 4567"
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                type="email"
                placeholder="john@example.com"
              />
            </div>
            <Field
              label="Destination country"
              value={form.destination_country}
              onChange={(v) => setForm((f) => ({ ...f, destination_country: v }))}
              placeholder="Canada"
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Assigned employee</span>
              <select
                value={form.assigned_employee_id}
                onChange={(e) => setForm((f) => ({ ...f, assigned_employee_id: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.name ?? "Team member"}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField<ClientApplicationStatus>
                label="Application status"
                value={form.application_status}
                onChange={(v) => setForm((f) => ({ ...f, application_status: v }))}
                options={CLIENT_STATUSES.filter((s) => s.value !== "all") as { value: ClientApplicationStatus; label: string }[]}
              />
              <SelectField<PaymentStatus>
                label="Payment status"
                value={form.payment_status}
                onChange={(v) => setForm((f) => ({ ...f, payment_status: v }))}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "paid", label: "Paid" },
                  { value: "failed", label: "Failed" },
                  { value: "refunded", label: "Refunded" },
                  { value: "partial", label: "Partial" },
                ]}
              />
              <SelectField<FinalResult>
                label="Final result"
                value={form.final_result}
                onChange={(v) => setForm((f) => ({ ...f, final_result: v }))}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "success", label: "Success" },
                  { value: "unsuccessful", label: "Unsuccessful" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onClose}
              className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => form.full_name.trim() && onSubmit(form)}
              disabled={loading || !form.full_name.trim()}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial ? "Save Changes" : "Add Client"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ── Profile body ────────────────────────────────────────── */

function ClientProfileBody({
  client,
  notes,
  canWrite,
  currentUserId,
  onAddNote,
}: {
  client: ConsultingClient;
  notes: ReturnType<typeof fetchClientNotes> extends Promise<infer T> ? T : never;
  canWrite: boolean;
  currentUserId: string;
  onAddNote: (body: string) => Promise<void>;
}) {
  const [noteBody, setNoteBody] = useState("");
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<"info" | "notes" | "timeline">("info");

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {(["info", "notes", "timeline"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition",
              tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="space-y-3">
          <InfoRow icon={Mail} label="Email" value={client.email ?? "—"} />
          <InfoRow icon={Phone} label="Phone" value={client.phone ?? "—"} />
          <InfoRow icon={Users} label="Destination" value={client.destination_country ?? "—"} />
          <InfoRow icon={Users} label="Assigned to" value={client.assigned_employee?.name ?? "Unassigned"} />
          <InfoRow icon={CheckSquare} label="Package" value={client.service?.title ?? "None"} />
          <div className="flex flex-wrap gap-2 pt-2">
            <StatusBadge status={client.payment_status} />
            <StatusBadge status={client.application_status} />
            <StatusBadge status={client.final_result} />
          </div>
        </div>
      )}

      {tab === "notes" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300/90">
            <StickyNote className="mr-1 inline h-3 w-3" />
            Internal notes — never visible to the client.
          </div>
          {canWrite && (
            <div className="space-y-2">
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add an internal note…"
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                onClick={async () => {
                  if (!noteBody.trim()) return;
                  setAdding(true);
                  try {
                    await onAddNote(noteBody.trim());
                    setNoteBody("");
                  } finally {
                    setAdding(false);
                  }
                }}
                disabled={adding || !noteBody.trim()}
                className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
              >
                {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Add Note
              </button>
            </div>
          )}
          {notes.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No notes yet</p>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{n.author?.name ?? "Staff"}</span>
                    <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-foreground">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-2">
          <InfoRow icon={Plus} label="Created" value={new Date(client.created_at).toLocaleString()} />
          {client.purchase_date && (
            <InfoRow icon={CheckSquare} label="Purchase date" value={new Date(client.purchase_date).toLocaleString()} />
          )}
          <InfoRow
            icon={CheckSquare}
            label="Last activity"
            value={new Date(client.last_activity_at).toLocaleString()}
          />
          <div className="pt-2 text-[11px] text-muted-foreground">
            Messages and appointments — coming in Phase 2.
          </div>
        </div>
      )}

      {/* Phase-2 disabled actions */}
      <div className="flex gap-2 border-t border-white/[0.06] pt-3">
        <button
          disabled
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[0.03] py-2 text-[11px] font-semibold text-muted-foreground/50"
        >
          <MessageSquare className="h-3 w-3" /> Message (Phase 2)
        </button>
        <button
          disabled
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[0.03] py-2 text-[11px] font-semibold text-muted-foreground/50"
        >
          <CheckSquare className="h-3 w-3" /> Task (Phase 2)
        </button>
      </div>
      <p className="text-center text-[10px] text-muted-foreground">Client ID: {client.id.slice(0, 8)}</p>
      {/* Avoid unused warning */}
      <span className="hidden">{currentUserId}</span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-right text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}
