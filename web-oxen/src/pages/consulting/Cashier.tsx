import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wallet,
  Plus,
  Minus,
  ArrowLeftRight,
  Download,
  Search,
  Loader2,
  X,
  Save,
  Upload,
  TrendingUp,
  TrendingDown,
  Banknote,
  AlertTriangle,
  RotateCcw,
  Filter,
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
  fetchCashierSummary,
  fetchCashierTransactions,
  fetchCategories,
  fetchCashierSettings,
  updateCashierSettings,
  createCashierTransaction,
  reverseCashierTransaction,
  addIncomeCategory,
  addExpenseCategory,
  type CashierTransaction,
  type CashierTxnInput,
  type TransactionType,
  type PaymentMethod,
} from "@/lib/consulting-pos";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "RUB", "UZS", "JPY"] as const;
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_card", label: "Bank card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "online", label: "Online payment" },
  { value: "installment", label: "Installment" },
  { value: "other", label: "Other" },
];

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export default function ConsultingCashier() {
  const { company, isTestMode, can } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categoryMgrOpen, setCategoryMgrOpen] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<CashierTransaction | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  useSEO({ title: "Cashier | OXEN Consulting", description: "Financial overview — income, expenses, balances, and transactions" });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["cashier-summary"] });
    queryClient.invalidateQueries({ queryKey: ["cashier-txns"] });
    queryClient.invalidateQueries({ queryKey: ["cashier-categories"] });
  }, [queryClient]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["cashier-summary", companyId],
    queryFn: () => fetchCashierSummary(companyId),
    enabled: !!companyId,
  });

  const { data: txns = [], isLoading: txnsLoading } = useQuery({
    queryKey: ["cashier-txns", companyId, typeFilter, categoryFilter, search, dateFrom, dateTo],
    queryFn: () =>
      fetchCashierTransactions(companyId, {
        type: typeFilter,
        category: categoryFilter,
        search,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      }),
    enabled: !!companyId,
  });

  const { data: categories } = useQuery({
    queryKey: ["cashier-categories", companyId],
    queryFn: () => fetchCategories(companyId),
    enabled: !!companyId,
  });

  const canWrite = can("payments:write") || can("payments:read") && isTestMode;

  const handleExport = useCallback(() => {
    const lines = [
      ["Date", "Type", "Category", "Amount", "Currency", "Method", "Description", "Client", "Reference", "Status"].join(","),
      ...txns.map((t) =>
        [
          t.date,
          t.type,
          `"${t.category.replace(/"/g, '""')}"`,
          t.amount,
          t.currency,
          t.method ?? "",
          `"${(t.description ?? "").replace(/"/g, '""')}"`,
          `"${(t.related_client_name ?? "").replace(/"/g, '""')}"`,
          `"${(t.transaction_reference ?? "").replace(/"/g, '""')}"`,
          t.is_reversed ? "Reversed" : "Active",
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashier-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Report exported" });
  }, [txns]);

  const handleReverseConfirm = useCallback(() => {
    if (!reverseTarget || !reverseReason.trim()) return;
    reverseCashierTransaction(companyId, reverseTarget.id, reverseReason.trim());
    invalidateAll();
    setReverseTarget(null);
    setReverseReason("");
    toast({ title: "Transaction reversed" });
  }, [reverseTarget, reverseReason, companyId, invalidateAll]);

  return (
    <DashboardShell
      title="Cashier"
      subtitle="Financial overview, income, expenses, and transactions"
      actions={
        canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]"
            >
              <Wallet className="h-3.5 w-3.5" />
              Opening balance
            </button>
            <button
              onClick={() => setCategoryMgrOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]"
            >
              <Filter className="h-3.5 w-3.5" />
              Categories
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        )
      }
    >
      {/* Top action buttons */}
      {canWrite && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setIncomeOpen(true)}
            className="gold-gradient flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add income
          </button>
          <button
            onClick={() => setExpenseOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground transition active:scale-95"
          >
            <Minus className="h-4 w-4" />
            Add expense
          </button>
          <button
            onClick={() => setTransferOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-white/[0.1] active:scale-95"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transfer
          </button>
        </div>
      )}

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : summary ? (
        <section className="mb-8">
          {/* Primary row */}
          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Current Balance"
              value={money(summary.currentBalance, summary.currency)}
              icon={Wallet}
              accent="gold"
              delay={0}
            />
            <SummaryCard
              label="Total Income"
              value={money(summary.totalIncome, summary.currency)}
              icon={TrendingUp}
              accent="green"
              delay={0.05}
            />
            <SummaryCard
              label="Total Expenses"
              value={money(summary.totalExpenses, summary.currency)}
              icon={TrendingDown}
              accent="red"
              delay={0.1}
            />
            <SummaryCard
              label="Net Profit"
              value={money(summary.netProfit, summary.currency)}
              icon={Banknote}
              accent={summary.netProfit >= 0 ? "green" : "red"}
              delay={0.15}
            />
          </div>
          {/* Secondary row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label="Today's Income" value={money(summary.todayIncome, summary.currency)} icon={TrendingUp} accent="green" delay={0.2} compact />
            <SummaryCard label="Today's Expenses" value={money(summary.todayExpenses, summary.currency)} icon={TrendingDown} accent="red" delay={0.22} compact />
            <SummaryCard label="Month Income" value={money(summary.monthIncome, summary.currency)} icon={TrendingUp} accent="green" delay={0.24} compact />
            <SummaryCard label="Month Expenses" value={money(summary.monthExpenses, summary.currency)} icon={TrendingDown} accent="red" delay={0.26} compact />
            <SummaryCard label="Outstanding" value={money(summary.outstandingPayments, summary.currency)} icon={AlertTriangle} accent="gold" delay={0.28} compact />
            <SummaryCard label="Refund Total" value={money(summary.refundTotal, summary.currency)} icon={RotateCcw} accent="red" delay={0.3} compact />
          </div>
          {/* Formula explainer */}
          <div className="mt-3 glass rounded-2xl p-3 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/70">Formula:</span> Current Balance = Opening Balance ({money(summary.openingBalance, summary.currency)}) + Total Income − Total Expenses. Net Profit = Total Income − Total Expenses.
          </div>
        </section>
      ) : null}

      {/* Transactions */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-bold text-foreground">Transactions</h3>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, client, reference…"
              className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | "all")}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All categories</option>
            {(categories?.income ?? []).map((c) => (
              <option key={`i-${c}`} value={c}>{c}</option>
            ))}
            {(categories?.expense ?? []).map((c) => (
              <option key={`e-${c}`} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {txnsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : txns.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No transactions yet"
            description="Record income and expenses to see your financial overview. POS client payments appear here automatically as income."
            action={canWrite ? { label: "Add income", onClick: () => setIncomeOpen(true) } : undefined}
          />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Method</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Related</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Employee</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {txns.map((t, i) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className={cn("hover:bg-white/[0.03]", t.is_reversed && "opacity-60")}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(t.date)}</td>
                      <td className="px-4 py-3">
                        <TxnTypeBadge type={t.type} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-foreground">{t.category}</td>
                      <td className={cn("whitespace-nowrap px-4 py-3 text-xs font-bold", t.type === "income" ? "text-emerald-400" : t.type === "expense" ? "text-destructive" : "text-foreground")}>
                        {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}{money(t.amount, t.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs capitalize text-muted-foreground">{t.method ?? "—"}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-xs text-foreground">{t.description ?? "—"}</td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-xs text-muted-foreground">
                        {t.related_client_name ? (
                          <span>{t.related_client_name}{t.related_package_title ? ` · ${t.related_package_title}` : ""}</span>
                        ) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{t.responsible_employee_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        {t.is_reversed ? (
                          <StatusBadge status="cancelled" label="Reversed" />
                        ) : t.source_pos_payment_id ? (
                          <StatusBadge status="active" label="POS-linked" />
                        ) : (
                          <StatusBadge status="active" label="Active" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canWrite && !t.is_reversed && (
                          <button
                            onClick={() => { setReverseTarget(t); setReverseReason(""); }}
                            className="rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive transition hover:bg-destructive/20"
                          >
                            Reverse
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 p-3 md:hidden">
              {txns.map((t) => (
                <div key={t.id} className={cn("rounded-xl border border-white/[0.04] bg-white/[0.02] p-3", t.is_reversed && "opacity-60")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <TxnTypeBadge type={t.type} />
                        <span className="text-[10px] text-muted-foreground">{formatDate(t.date)}</span>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-foreground">{t.description ?? t.category}</p>
                      <p className="text-[10px] text-muted-foreground">{t.category}</p>
                    </div>
                    <p className={cn("shrink-0 text-sm font-bold", t.type === "income" ? "text-emerald-400" : t.type === "expense" ? "text-destructive" : "text-foreground")}>
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}{money(t.amount, t.currency)}
                    </p>
                  </div>
                  {t.is_reversed && <p className="mt-1 text-[10px] text-amber-400">Reversed{t.reversal_reason ? `: ${t.reversal_reason}` : ""}</p>}
                  {canWrite && !t.is_reversed && (
                    <button
                      onClick={() => { setReverseTarget(t); setReverseReason(""); }}
                      className="mt-2 rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive"
                    >
                      Reverse
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      {incomeOpen && (
        <TxnModal
          type="income"
          companyId={companyId}
          categories={categories?.income ?? []}
          onClose={() => setIncomeOpen(false)}
          onSaved={() => {
            invalidateAll();
            setIncomeOpen(false);
            toast({ title: "Income recorded" });
          }}
        />
      )}
      {expenseOpen && (
        <TxnModal
          type="expense"
          companyId={companyId}
          categories={categories?.expense ?? []}
          onClose={() => setExpenseOpen(false)}
          onSaved={() => {
            invalidateAll();
            setExpenseOpen(false);
            toast({ title: "Expense recorded" });
          }}
        />
      )}
      {transferOpen && (
        <TxnModal
          type="transfer"
          companyId={companyId}
          categories={["Account transfer"]}
          onClose={() => setTransferOpen(false)}
          onSaved={() => {
            invalidateAll();
            setTransferOpen(false);
            toast({ title: "Transfer recorded" });
          }}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          companyId={companyId}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            invalidateAll();
            setSettingsOpen(false);
            toast({ title: "Opening balance updated" });
          }}
        />
      )}
      {categoryMgrOpen && (
        <CategoryManagerModal
          companyId={companyId}
          onClose={() => setCategoryMgrOpen(false)}
          onSaved={() => {
            invalidateAll();
            setCategoryMgrOpen(false);
          }}
        />
      )}

      <ConfirmDialog
        open={!!reverseTarget}
        title="Reverse transaction"
        message={
          reverseTarget
            ? `Reverse this ${reverseTarget.type} of ${money(reverseTarget.amount, reverseTarget.currency)}? This creates an audit entry — the transaction is never deleted.`
            : ""
        }
        confirmLabel="Reverse"
        destructive
        onConfirm={handleReverseConfirm}
        onCancel={() => { setReverseTarget(null); setReverseReason(""); }}
      />
      {/* Reverse reason input shown alongside confirm dialog */}
      <AnimatePresenceReasonInput
        open={!!reverseTarget}
        reason={reverseReason}
        onChange={setReverseReason}
      />
    </DashboardShell>
  );
}

/* ── Summary card ─────────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
  delay = 0,
  compact = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "gold" | "green" | "red" | "blue";
  delay?: number;
  compact?: boolean;
}) {
  const accentMap: Record<string, string> = {
    gold: "bg-primary/15 text-primary",
    green: "bg-emerald-500/15 text-emerald-400",
    red: "bg-destructive/15 text-destructive",
    blue: "bg-sky-500/15 text-sky-400",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 26, delay }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn("mt-1.5 font-display font-extrabold text-foreground", compact ? "text-lg" : "text-2xl")}>{value}</p>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </motion.div>
  );
}

/* ── Transaction type badge ───────────────────────────────── */

function TxnTypeBadge({ type }: { type: TransactionType }) {
  const map: Record<TransactionType, { cls: string; label: string }> = {
    income: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Income" },
    expense: { cls: "bg-destructive/15 text-destructive border-destructive/20", label: "Expense" },
    transfer: { cls: "bg-sky-500/15 text-sky-400 border-sky-500/20", label: "Transfer" },
  };
  const s = map[type];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize whitespace-nowrap", s.cls)}>
      {s.label}
    </span>
  );
}

/* ── Transaction modal (income/expense/transfer) ──────────── */

interface TxnModalProps {
  type: TransactionType;
  companyId: string;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

function TxnModal({ type, companyId, categories, onClose, onSaved }: TxnModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(() => fetchCashierSettings(companyId).currency);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(categories[0] ?? "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const settings = useMemo(() => fetchCashierSettings(companyId), [companyId]);

  const handleReceiptUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => setReceiptUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(async () => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0) {
      toast({ title: "Amount must be greater than 0", variant: "destructive" });
      return;
    }
    if (!category.trim()) {
      toast({ title: "Category is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Persist a new custom category if entered
      let finalCategory = category;
      if (newCategory.trim() && !categories.includes(newCategory.trim())) {
        if (type === "income") addIncomeCategory(companyId, newCategory.trim());
        else if (type === "expense") addExpenseCategory(companyId, newCategory.trim());
        finalCategory = newCategory.trim();
      }
      const input: CashierTxnInput = {
        type,
        category: finalCategory,
        amount: amountNum,
        currency,
        date,
        method: type === "transfer" ? null : method,
        description: description || null,
        related_sale_id: null,
        related_client_name: null,
        related_package_title: null,
        responsible_employee_id: user?.id ?? null,
        responsible_employee_name: user?.name ?? null,
        receipt_url: receiptUrl,
        transaction_reference: reference || null,
        source_pos_payment_id: null,
      };
      createCashierTransaction(companyId, input, user?.id ?? "", user?.name ?? null);
      onSaved();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [amount, category, newCategory, categories, type, companyId, currency, date, method, description, reference, receiptUrl, user, onSaved]);

  const title = type === "income" ? "Add Income" : type === "expense" ? "Add Expense" : "Transfer Between Accounts";

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h3 className="font-display text-base font-bold">{title}</h3>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount" type="number" value={amount} onChange={setAmount} placeholder="0" required />
              <SelectField<string> label="Currency" value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date" type="date" value={date} onChange={setDate} />
              {type !== "transfer" && (
                <SelectField<PaymentMethod> label="Payment method" value={method} onChange={setMethod} options={PAYMENT_METHODS} />
              )}
            </div>
            <SelectField<string>
              label="Category"
              value={category}
              onChange={setCategory}
              options={categories.map((c) => ({ value: c, label: c }))}
              required
            />
            {/* Add a new custom category */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Add new category (optional)
              </span>
              <div className="flex gap-2">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Legal fees"
                  className="flex-1 rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <Field label="Description" type="textarea" value={description} onChange={setDescription} placeholder="Optional note about this transaction…" />
            <Field label="Transaction reference" value={reference} onChange={setReference} placeholder="TXN-0001" />

            {/* Receipt upload */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Receipt / document</span>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] py-4 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                <Upload className="h-4 w-4" />
                {receiptUrl ? "Receipt attached" : "Upload receipt"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleReceiptUpload(f);
                  }}
                />
              </label>
              {receiptUrl && (
                <div className="mt-2 overflow-hidden rounded-lg border border-white/[0.06]">
                  <img src={receiptUrl} alt="Receipt" className="h-24 w-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <footer className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
            <button onClick={onClose} className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition active:scale-95 disabled:opacity-50",
                type === "expense" ? "bg-destructive text-destructive-foreground" : "gold-gradient text-primary-foreground",
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </footer>
        </div>
      </motion.div>
    </>
  );
}

/* ── Settings modal (opening balance) ─────────────────────── */

function SettingsModal({ companyId, onClose, onSaved }: { companyId: string; onClose: () => void; onSaved: () => void }) {
  const [settings, setSettings] = useState(() => fetchCashierSettings(companyId));
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(() => {
    setSaving(true);
    try {
      updateCashierSettings(companyId, {
        opening_balance: parseFloat(String(settings.opening_balance)) || 0,
        currency: settings.currency,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }, [companyId, settings, onSaved]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h3 className="font-display text-base font-bold">Cashier Settings</h3>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="space-y-4 px-5 py-4">
            <Field label="Opening balance" type="number" value={String(settings.opening_balance)} onChange={(v) => setSettings((s) => ({ ...s, opening_balance: parseFloat(v) || 0 }))} placeholder="0" />
            <SelectField<string> label="Currency" value={settings.currency} onChange={(v) => setSettings((s) => ({ ...s, currency: v }))} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            <p className="text-[11px] text-muted-foreground">
              Current Balance = Opening Balance + Total Income − Total Expenses.
            </p>
          </div>
          <footer className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
            <button onClick={onClose} className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </footer>
        </div>
      </motion.div>
    </>
  );
}

/* ── Category manager modal ───────────────────────────────── */

function CategoryManagerModal({ companyId, onClose, onSaved }: { companyId: string; onClose: () => void; onSaved: () => void }) {
  const [cats, setCats] = useState(() => fetchCategories(companyId));
  const [newIncome, setNewIncome] = useState("");
  const [newExpense, setNewExpense] = useState("");

  const handleAddIncome = useCallback(() => {
    if (!newIncome.trim()) return;
    const next = addIncomeCategory(companyId, newIncome.trim());
    setCats(next);
    setNewIncome("");
  }, [companyId, newIncome]);

  const handleAddExpense = useCallback(() => {
    if (!newExpense.trim()) return;
    const next = addExpenseCategory(companyId, newExpense.trim());
    setCats(next);
    setNewExpense("");
  }, [companyId, newExpense]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h3 className="font-display text-base font-bold">Categories</h3>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">Income categories</h4>
              <div className="flex flex-wrap gap-1.5">
                {cats.income.map((c) => (
                  <span key={c} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">{c}</span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={newIncome}
                  onChange={(e) => setNewIncome(e.target.value)}
                  placeholder="New income category"
                  className="flex-1 rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
                <button onClick={handleAddIncome} className="gold-gradient flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs font-bold text-primary-foreground">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-destructive">Expense categories</h4>
              <div className="flex flex-wrap gap-1.5">
                {cats.expense.map((c) => (
                  <span key={c} className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">{c}</span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={newExpense}
                  onChange={(e) => setNewExpense(e.target.value)}
                  placeholder="New expense category"
                  className="flex-1 rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
                <button onClick={handleAddExpense} className="flex items-center gap-1 rounded-xl bg-destructive px-3 py-2.5 text-xs font-bold text-destructive-foreground">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          </div>
          <footer className="border-t border-white/[0.06] px-5 py-4">
            <button onClick={onSaved} className="gold-gradient w-full rounded-2xl py-3 text-sm font-bold text-primary-foreground">
              Done
            </button>
          </footer>
        </div>
      </motion.div>
    </>
  );
}

/* ── Reverse reason input (shown when reversing) ──────────── */

function AnimatePresenceReasonInput({
  open,
  reason,
  onChange,
}: {
  open: boolean;
  reason: string;
  onChange: (v: string) => void;
}) {
  // Render a small floating input above the confirm dialog when reversing
  // so the user can supply a reason before confirming.
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed left-1/2 top-[calc(50%+120px)] z-[92] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2"
    >
      <div className="glass-strong rounded-2xl p-3 shadow-2xl">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Reason for reversal</span>
          <input
            value={reason}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Refund / correction / etc."
            className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            autoFocus
          />
        </label>
      </div>
    </motion.div>
  );
}
