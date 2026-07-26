import type { Json } from "@/integrations/supabase/types";

/* ============================================================
   POS + Cashier — Types + Data Access Layer
   ------------------------------------------------
   POS sales management system for consulting companies:
   sell published service packages to clients, track payments
   per sale, and automatically create income transactions in
   the Cashier page.

   Cashier: full financial overview with income/expense
   transactions, custom income/expense categories, opening
   balance, and audit-safe reversal (no hard deletes).

   Test-mode: stored in localStorage under the same prefix as
   the rest of the consulting test-mode layer so everything
   stays in sync. When Supabase tables are applied, the fetch
   functions can be swapped to real queries without UI changes.

   Storage keys (per company):
     oxen.consulting.test.<companyId>.posSales
     oxen.consulting.test.<companyId>.posPayments
     oxen.consulting.test.<companyId>.cashierTxns
     oxen.consulting.test.<companyId>.cashierCategories
     oxen.consulting.test.<companyId>.cashierSettings
   ============================================================ */

const PREFIX = "oxen.consulting.test";

function key(companyId: string, kind: string): string {
  return `${PREFIX}.${companyId}.${kind}`;
}

function readArr<T>(k: string): T[] {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArr<T>(k: string, rows: T[]): void {
  try {
    localStorage.setItem(k, JSON.stringify(rows));
  } catch (e) {
    console.error("pos/cashier write failed", k, e);
  }
}

function readObj<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeObj<T>(k: string, value: T): void {
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Enums ──────────────────────────────────────────────────

export type PackageSaleStatus =
  | "active"
  | "draft"
  | "sold_out"
  | "closed";

export type SaleStatus =
  | "not_paid"
  | "partially_paid"
  | "fully_paid"
  | "overdue"
  | "completed"
  | "cancelled";

export type PaymentMethod =
  | "cash"
  | "bank_card"
  | "bank_transfer"
  | "online"
  | "installment"
  | "other";

export type PaymentRecordStatus =
  | "not_paid"
  | "partially_paid"
  | "fully_paid"
  | "overdue"
  | "refunded"
  | "cancelled";

export type TransactionType = "income" | "expense" | "transfer";

export type PaymentProgressTier =
  | "low" // 0–24%
  | "partial" // 25–49%
  | "mostly" // 50–99%
  | "full"; // 100%

// ── Types ──────────────────────────────────────────────────

/** A single payment recorded against a POS sale. Never overwritten. */
export interface PosPayment {
  id: string;
  sale_id: string;
  consulting_company_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  method: PaymentMethod;
  /** Optional transaction/reference number from the processor or cashier. */
  transaction_reference: string | null;
  /** Employee/cashier who received the payment. */
  received_by: string | null;
  received_by_name: string | null;
  comment: string | null;
  /** Optional receipt image or document URL (data URL in test mode). */
  receipt_url: string | null;
  /** Marks a payment as reversed (refunded/cancelled) — never deleted. */
  is_reversed: boolean;
  reversal_reason: string | null;
  created_at: string;
  created_by: string;
}

/** A sale of a service package to a client. */
export interface PosSale {
  id: string;
  consulting_company_id: string;
  // Package snapshot (denormalized for fast rendering)
  package_id: string;
  package_title: string;
  package_image: string | null;
  package_category: string | null;
  destination_country: string | null;
  duration: string | null;
  // Client personal info
  first_name: string;
  last_name: string;
  phone: string;
  additional_phone: string | null;
  email: string | null;
  passport_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  citizenship: string | null;
  current_city: string | null;
  address: string | null;
  // Package/sale info
  travel_or_program_date: string | null;
  package_full_price: number;
  currency: string;
  discount_amount: number;
  final_price: number;
  assigned_employee_id: string | null;
  assigned_employee_name: string | null;
  contract_number: string | null;
  application_date: string | null;
  notes: string | null;
  // Document status checklist
  doc_passport_received: boolean;
  doc_photo_received: boolean;
  doc_application_form_received: boolean;
  doc_diploma_received: boolean;
  doc_translation_received: boolean;
  doc_other: string | null;
  doc_missing_notes: string | null;
  // Payment tracker (derived from payments list, but stored for quick filter)
  total_paid: number;
  remaining_amount: number;
  payment_percentage: number;
  next_payment_date: string | null;
  payment_method: PaymentMethod | null;
  payment_status: PaymentRecordStatus;
  // Lifecycle
  sale_status: SaleStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Extra metadata
  metadata: Json;
}

export interface CashierTransaction {
  id: string;
  consulting_company_id: string;
  type: TransactionType;
  category: string;
  amount: number;
  currency: string;
  date: string;
  method: PaymentMethod | null;
  description: string | null;
  /** Linked client/sale, if applicable. */
  related_sale_id: string | null;
  related_client_name: string | null;
  related_package_title: string | null;
  responsible_employee_id: string | null;
  responsible_employee_name: string | null;
  receipt_url: string | null;
  transaction_reference: string | null;
  /** POS-linked income transactions auto-created from POS payments. */
  source_pos_payment_id: string | null;
  /** Audit: marks reversed (never deleted). */
  is_reversed: boolean;
  reversal_reason: string | null;
  reversed_at: string | null;
  created_at: string;
  created_by: string;
  created_by_name: string | null;
}

export interface CashierSettings {
  opening_balance: number;
  currency: string;
}

// ── Default income categories (per spec) ─────────────────────

export const DEFAULT_INCOME_CATEGORIES: string[] = [
  "Tour package payment",
  "Visa service payment",
  "University application service",
  "Consulting service",
  "Client advance payment",
  "Full client payment",
  "Commission income",
  "Additional service income",
  "Refund returned to company",
  "Investment",
  "Other income",
];

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  "Office rent",
  "Salaries",
  "Marketing",
  "Software subscriptions",
  "Utilities",
  "Travel expenses",
  "Refund to client",
  "Tax",
  "Other expense",
];

// ── Helpers ──────────────────────────────────────────────────

export function computePaymentProgress(
  totalPaid: number,
  finalPrice: number,
): { percentage: number; remaining: number; tier: PaymentProgressTier } {
  const safeFinal = finalPrice > 0 ? finalPrice : 0;
  const pct = safeFinal > 0 ? Math.min(100, Math.round((totalPaid / safeFinal) * 1000) / 10) : 0;
  const remaining = Math.max(0, safeFinal - totalPaid);
  let tier: PaymentProgressTier = "low";
  if (pct >= 100) tier = "full";
  else if (pct >= 50) tier = "mostly";
  else if (pct >= 25) tier = "partial";
  return { percentage: pct, remaining, tier };
}

export function derivePaymentStatus(
  totalPaid: number,
  finalPrice: number,
  nextPaymentDate: string | null,
  saleStatus: SaleStatus,
): PaymentRecordStatus {
  if (saleStatus === "cancelled") return "cancelled";
  const safeFinal = finalPrice > 0 ? finalPrice : 0;
  if (totalPaid <= 0) {
    // Check overdue: next payment date in the past
    if (nextPaymentDate && new Date(nextPaymentDate).getTime() < Date.now()) return "overdue";
    return "not_paid";
  }
  if (totalPaid >= safeFinal && safeFinal > 0) return "fully_paid";
  if (nextPaymentDate && new Date(nextPaymentDate).getTime() < Date.now()) return "overdue";
  return "partially_paid";
}

export function fullName(sale: Pick<PosSale, "first_name" | "last_name">): string {
  return `${sale.first_name} ${sale.last_name}`.trim();
}

// ── Sales CRUD ───────────────────────────────────────────────

export interface PosSaleInput {
  package_id: string;
  package_title: string;
  package_image: string | null;
  package_category: string | null;
  destination_country: string | null;
  duration: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  additional_phone: string | null;
  email: string | null;
  passport_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  citizenship: string | null;
  current_city: string | null;
  address: string | null;
  travel_or_program_date: string | null;
  package_full_price: number;
  currency: string;
  discount_amount: number;
  assigned_employee_id: string | null;
  assigned_employee_name: string | null;
  contract_number: string | null;
  application_date: string | null;
  notes: string | null;
  doc_passport_received: boolean;
  doc_photo_received: boolean;
  doc_application_form_received: boolean;
  doc_diploma_received: boolean;
  doc_translation_received: boolean;
  doc_other: string | null;
  doc_missing_notes: string | null;
  next_payment_date: string | null;
  payment_method: PaymentMethod | null;
}

export function fetchPosSales(
  companyId: string,
  opts: {
    search?: string;
    packageId?: string | "all";
    destination?: string | "all";
    status?: SaleStatus | "all";
    employeeId?: string | "all";
    dateFrom?: string | null;
    dateTo?: string | null;
  } = {},
): PosSale[] {
  let rows = readArr<PosSale>(key(companyId, "posSales"));
  if (opts.packageId && opts.packageId !== "all") {
    rows = rows.filter((r) => r.package_id === opts.packageId);
  }
  if (opts.destination && opts.destination !== "all") {
    rows = rows.filter((r) => r.destination_country === opts.destination);
  }
  if (opts.status && opts.status !== "all") {
    rows = rows.filter((r) => r.sale_status === opts.status);
  }
  if (opts.employeeId && opts.employeeId !== "all") {
    rows = rows.filter((r) => r.assigned_employee_id === opts.employeeId);
  }
  if (opts.dateFrom) {
    rows = rows.filter((r) => r.created_at >= opts.dateFrom!);
  }
  if (opts.dateTo) {
    rows = rows.filter((r) => r.created_at <= opts.dateTo!);
  }
  if (opts.search?.trim()) {
    const q = opts.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        r.package_title.toLowerCase().includes(q) ||
        (r.contract_number ?? "").toLowerCase().includes(q),
    );
  }
  // Re-derive payment state from payments list (single source of truth)
  const payments = readArr<PosPayment>(key(companyId, "posPayments"));
  return rows
    .map((r) => {
      const salePayments = payments.filter(
        (p) => p.sale_id === r.id && !p.is_reversed,
      );
      const totalPaid = salePayments.reduce((s, p) => s + p.amount, 0);
      const prog = computePaymentProgress(totalPaid, r.final_price);
      const payment_status = derivePaymentStatus(
        totalPaid,
        r.final_price,
        r.next_payment_date,
        r.sale_status,
      );
      return {
        ...r,
        total_paid: totalPaid,
        remaining_amount: prog.remaining,
        payment_percentage: prog.percentage,
        payment_status,
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function fetchPosSale(
  companyId: string,
  saleId: string,
): PosSale | null {
  return fetchPosSales(companyId).find((s) => s.id === saleId) ?? null;
}

export function createPosSale(
  companyId: string,
  input: PosSaleInput,
  createdBy: string,
): PosSale {
  const k = key(companyId, "posSales");
  const rows = readArr<PosSale>(k);
  const now = nowIso();
  const final_price = Math.max(0, input.package_full_price - input.discount_amount);
  const sale: PosSale = {
    id: uid("sale"),
    consulting_company_id: companyId,
    package_id: input.package_id,
    package_title: input.package_title,
    package_image: input.package_image,
    package_category: input.package_category,
    destination_country: input.destination_country,
    duration: input.duration,
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone,
    additional_phone: input.additional_phone,
    email: input.email,
    passport_number: input.passport_number,
    date_of_birth: input.date_of_birth,
    gender: input.gender,
    citizenship: input.citizenship,
    current_city: input.current_city,
    address: input.address,
    travel_or_program_date: input.travel_or_program_date,
    package_full_price: input.package_full_price,
    currency: input.currency,
    discount_amount: input.discount_amount,
    final_price,
    assigned_employee_id: input.assigned_employee_id,
    assigned_employee_name: input.assigned_employee_name,
    contract_number: input.contract_number,
    application_date: input.application_date,
    notes: input.notes,
    doc_passport_received: input.doc_passport_received,
    doc_photo_received: input.doc_photo_received,
    doc_application_form_received: input.doc_application_form_received,
    doc_diploma_received: input.doc_diploma_received,
    doc_translation_received: input.doc_translation_received,
    doc_other: input.doc_other,
    doc_missing_notes: input.doc_missing_notes,
    total_paid: 0,
    remaining_amount: final_price,
    payment_percentage: 0,
    next_payment_date: input.next_payment_date,
    payment_method: input.payment_method,
    payment_status: "not_paid",
    sale_status: "not_paid",
    created_at: now,
    updated_at: now,
    created_by: createdBy,
    metadata: {} as Json,
  };
  rows.push(sale);
  writeArr(k, rows);
  return sale;
}

export function updatePosSale(
  companyId: string,
  saleId: string,
  patch: Partial<PosSale>,
): PosSale | null {
  const k = key(companyId, "posSales");
  const rows = readArr<PosSale>(k);
  const idx = rows.findIndex((r) => r.id === saleId);
  if (idx === -1) return null;
  const prev = rows[idx];
  // Recompute final_price if price/discount changed
  const nextPrice = patch.package_full_price ?? prev.package_full_price;
  const nextDiscount = patch.discount_amount ?? prev.discount_amount;
  const final_price = Math.max(0, nextPrice - nextDiscount);
  rows[idx] = {
    ...prev,
    ...patch,
    package_full_price: nextPrice,
    discount_amount: nextDiscount,
    final_price,
    updated_at: nowIso(),
  };
  writeArr(k, rows);
  return fetchPosSale(companyId, saleId);
}

export function setSaleStatus(
  companyId: string,
  saleId: string,
  status: SaleStatus,
): PosSale | null {
  return updatePosSale(companyId, saleId, { sale_status: status });
}

// ── Payments CRUD ────────────────────────────────────────────

export interface PosPaymentInput {
  amount: number;
  currency: string;
  payment_date: string;
  method: PaymentMethod;
  transaction_reference: string | null;
  received_by: string | null;
  received_by_name: string | null;
  comment: string | null;
  receipt_url: string | null;
}

export function fetchSalePayments(
  companyId: string,
  saleId: string,
): PosPayment[] {
  return readArr<PosPayment>(key(companyId, "posPayments"))
    .filter((p) => p.sale_id === saleId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

/**
 * Add a payment to a sale. Also auto-creates a matching income
 * transaction in the Cashier page (linked via source_pos_payment_id).
 * Never overwrites previous payments.
 */
export function addPosPayment(
  companyId: string,
  saleId: string,
  input: PosPaymentInput,
  createdBy: string,
  createdByName: string | null,
): { payment: PosPayment; sale: PosSale | null; txn: CashierTransaction } {
  const sale = fetchPosSale(companyId, saleId);
  if (!sale) throw new Error("Sale not found");

  const k = key(companyId, "posPayments");
  const rows = readArr<PosPayment>(k);
  const now = nowIso();
  const payment: PosPayment = {
    id: uid("pay"),
    sale_id: saleId,
    consulting_company_id: companyId,
    amount: input.amount,
    currency: input.currency,
    payment_date: input.payment_date,
    method: input.method,
    transaction_reference: input.transaction_reference,
    received_by: input.received_by,
    received_by_name: input.received_by_name,
    comment: input.comment,
    receipt_url: input.receipt_url,
    is_reversed: false,
    reversal_reason: null,
    created_at: now,
    created_by: createdBy,
  };
  rows.push(payment);
  writeArr(k, rows);

  // Auto-create cashier income transaction linked to this payment
  const category = mapPackageCategoryToIncomeCategory(sale.package_category);
  const txn = createCashierTransaction(companyId, {
    type: "income",
    category,
    amount: input.amount,
    currency: input.currency,
    date: input.payment_date,
    method: input.method,
    description: `Client payment — ${fullName(sale)} · ${sale.package_title}`,
    related_sale_id: saleId,
    related_client_name: fullName(sale),
    related_package_title: sale.package_title,
    responsible_employee_id: input.received_by,
    responsible_employee_name: input.received_by_name,
    receipt_url: input.receipt_url,
    transaction_reference: input.transaction_reference,
    source_pos_payment_id: payment.id,
  }, createdBy, createdByName);

  // Update sale payment_status; if fully paid, mark sale_status fully_paid
  const updatedSale = fetchPosSale(companyId, saleId);
  if (updatedSale && updatedSale.payment_status === "fully_paid" && updatedSale.sale_status === "not_paid") {
    updatePosSale(companyId, saleId, { sale_status: "fully_paid" });
  }

  return { payment, sale: fetchPosSale(companyId, saleId), txn };
}

/** Reverse (refund/cancel) a payment — never delete. */
export function reversePosPayment(
  companyId: string,
  paymentId: string,
  reason: string,
  reversedBy: string,
  reversedByName: string | null,
): { payment: PosPayment | null; reversalTxn: CashierTransaction | null } {
  const k = key(companyId, "posPayments");
  const rows = readArr<PosPayment>(k);
  const idx = rows.findIndex((p) => p.id === paymentId);
  if (idx === -1) return { payment: null, reversalTxn: null };
  if (rows[idx].is_reversed) return { payment: rows[idx], reversalTxn: null };

  rows[idx] = {
    ...rows[idx],
    is_reversed: true,
    reversal_reason: reason,
  };
  writeArr(k, rows);
  const payment = rows[idx];

  // Create a balancing expense (refund) transaction in cashier
  const sale = fetchPosSale(companyId, payment.sale_id);
  const reversalTxn = createCashierTransaction(companyId, {
    type: "expense",
    category: "Refund to client",
    amount: payment.amount,
    currency: payment.currency,
    date: nowIso(),
    method: payment.method,
    description: `Reversed payment — ${sale ? fullName(sale) : "client"}${sale ? ` · ${sale.package_title}` : ""} (${reason})`,
    related_sale_id: payment.sale_id,
    related_client_name: sale ? fullName(sale) : null,
    related_package_title: sale?.package_title ?? null,
    responsible_employee_id: reversedBy,
    responsible_employee_name: reversedByName,
    receipt_url: null,
    transaction_reference: payment.transaction_reference,
    source_pos_payment_id: payment.id,
  }, reversedBy, reversedByName);

  return { payment, reversalTxn };
}

function mapPackageCategoryToIncomeCategory(pkgCategory: string | null): string {
  switch (pkgCategory) {
    case "Visa":
      return "Visa service payment";
    case "Travel":
    case "Tourism":
      return "Tour package payment";
    case "Education":
      return "University application service";
    case "Consultation":
    case "General":
      return "Consulting service";
    case "Immigration":
    case "Business":
      return "Consulting service";
    default:
      return "Other income";
  }
}

// ── Cashier settings ─────────────────────────────────────────

export function fetchCashierSettings(companyId: string): CashierSettings {
  return readObj<CashierSettings>(key(companyId, "cashierSettings"), {
    opening_balance: 0,
    currency: "USD",
  });
}

export function updateCashierSettings(
  companyId: string,
  patch: Partial<CashierSettings>,
): CashierSettings {
  const current = fetchCashierSettings(companyId);
  const next = { ...current, ...patch };
  writeObj(key(companyId, "cashierSettings"), next);
  return next;
}

// ── Cashier categories (default + custom) ────────────────────

export interface CategoryState {
  income: string[];
  expense: string[];
}

export function fetchCategories(companyId: string): CategoryState {
  const stored = readObj<Partial<CategoryState> | null>(key(companyId, "cashierCategories"), null);
  return {
    income: stored?.income?.length ? stored.income : [...DEFAULT_INCOME_CATEGORIES],
    expense: stored?.expense?.length ? stored.expense : [...DEFAULT_EXPENSE_CATEGORIES],
  };
}

export function addIncomeCategory(companyId: string, name: string): CategoryState {
  const cats = fetchCategories(companyId);
  if (!cats.income.includes(name)) cats.income = [...cats.income, name];
  writeObj(key(companyId, "cashierCategories"), cats);
  return cats;
}

export function addExpenseCategory(companyId: string, name: string): CategoryState {
  const cats = fetchCategories(companyId);
  if (!cats.expense.includes(name)) cats.expense = [...cats.expense, name];
  writeObj(key(companyId, "cashierCategories"), cats);
  return cats;
}

// ── Cashier transactions ─────────────────────────────────────

export interface CashierTxnInput {
  type: TransactionType;
  category: string;
  amount: number;
  currency: string;
  date: string;
  method: PaymentMethod | null;
  description: string | null;
  related_sale_id: string | null;
  related_client_name: string | null;
  related_package_title: string | null;
  responsible_employee_id: string | null;
  responsible_employee_name: string | null;
  receipt_url: string | null;
  transaction_reference: string | null;
  source_pos_payment_id: string | null;
}

export function fetchCashierTransactions(
  companyId: string,
  opts: {
    type?: TransactionType | "all";
    category?: string | "all";
    search?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
  } = {},
): CashierTransaction[] {
  let rows = readArr<CashierTransaction>(key(companyId, "cashierTxns"));
  if (opts.type && opts.type !== "all") {
    rows = rows.filter((r) => r.type === opts.type);
  }
  if (opts.category && opts.category !== "all") {
    rows = rows.filter((r) => r.category === opts.category);
  }
  if (opts.dateFrom) {
    rows = rows.filter((r) => r.date >= opts.dateFrom!);
  }
  if (opts.dateTo) {
    rows = rows.filter((r) => r.date <= opts.dateTo!);
  }
  if (opts.search?.trim()) {
    const q = opts.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.description ?? "").toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.related_client_name ?? "").toLowerCase().includes(q) ||
        (r.transaction_reference ?? "").toLowerCase().includes(q),
    );
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function createCashierTransaction(
  companyId: string,
  input: CashierTxnInput,
  createdBy: string,
  createdByName: string | null,
): CashierTransaction {
  const k = key(companyId, "cashierTxns");
  const rows = readArr<CashierTransaction>(k);
  const now = nowIso();
  const txn: CashierTransaction = {
    id: uid("txn"),
    consulting_company_id: companyId,
    type: input.type,
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    date: input.date,
    method: input.method,
    description: input.description,
    related_sale_id: input.related_sale_id,
    related_client_name: input.related_client_name,
    related_package_title: input.related_package_title,
    responsible_employee_id: input.responsible_employee_id,
    responsible_employee_name: input.responsible_employee_name,
    receipt_url: input.receipt_url,
    transaction_reference: input.transaction_reference,
    source_pos_payment_id: input.source_pos_payment_id,
    is_reversed: false,
    reversal_reason: null,
    reversed_at: null,
    created_at: now,
    created_by: createdBy,
    created_by_name: createdByName,
  };
  rows.push(txn);
  writeArr(k, rows);
  return txn;
}

export function reverseCashierTransaction(
  companyId: string,
  txnId: string,
  reason: string,
): CashierTransaction | null {
  const k = key(companyId, "cashierTxns");
  const rows = readArr<CashierTransaction>(k);
  const idx = rows.findIndex((r) => r.id === txnId);
  if (idx === -1) return null;
  if (rows[idx].is_reversed) return rows[idx];
  rows[idx] = {
    ...rows[idx],
    is_reversed: true,
    reversal_reason: reason,
    reversed_at: nowIso(),
  };
  writeArr(k, rows);
  return rows[idx];
}

// ── Cashier summary ──────────────────────────────────────────

export interface CashierSummary {
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  currentBalance: number;
  todayIncome: number;
  todayExpenses: number;
  monthIncome: number;
  monthExpenses: number;
  outstandingPayments: number;
  refundTotal: number;
  currency: string;
}

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate();
}

function isSameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function fetchCashierSummary(companyId: string): CashierSummary {
  const settings = fetchCashierSettings(companyId);
  const txns = fetchCashierTransactions(companyId);
  const active = txns.filter((t) => !t.is_reversed);
  const incomeTxns = active.filter((t) => t.type === "income");
  const expenseTxns = active.filter((t) => t.type === "expense");
  const refundTxns = expenseTxns.filter((t) => t.category === "Refund to client");

  const totalIncome = incomeTxns.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenseTxns.reduce((s, t) => s + t.amount, 0);
  const now = new Date();
  const todayIncome = incomeTxns.filter((t) => isSameDay(t.date, now)).reduce((s, t) => s + t.amount, 0);
  const todayExpenses = expenseTxns.filter((t) => isSameDay(t.date, now)).reduce((s, t) => s + t.amount, 0);
  const monthIncome = incomeTxns.filter((t) => isSameMonth(t.date, now)).reduce((s, t) => s + t.amount, 0);
  const monthExpenses = expenseTxns.filter((t) => isSameMonth(t.date, now)).reduce((s, t) => s + t.amount, 0);
  const refundTotal = refundTxns.reduce((s, t) => s + t.amount, 0);

  // Outstanding = sum of remaining across all non-completed/cancelled sales
  const sales = fetchPosSales(companyId).filter(
    (s) => s.sale_status !== "completed" && s.sale_status !== "cancelled",
  );
  const outstandingPayments = sales.reduce((s, x) => s + x.remaining_amount, 0);

  return {
    openingBalance: settings.opening_balance,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    currentBalance: settings.opening_balance + totalIncome - totalExpenses,
    todayIncome,
    todayExpenses,
    monthIncome,
    monthExpenses,
    outstandingPayments,
    refundTotal,
    currency: settings.currency,
  };
}

// ── Package status helper (for POS package cards) ────────────

export function derivePackageStatus(
  availableSlots: number | null,
  isPublished: boolean,
  soldCount: number,
): PackageSaleStatus {
  if (!isPublished) return "draft";
  if (availableSlots != null && availableSlots <= 0) return "sold_out";
  if (availableSlots != null && soldCount >= availableSlots) return "sold_out";
  if (availableSlots != null && availableSlots - soldCount <= 0) return "closed";
  return "active";
}

export function countSoldForPackage(
  companyId: string,
  packageId: string,
): number {
  return readArr<PosSale>(key(companyId, "posSales")).filter(
    (s) => s.package_id === packageId && s.sale_status !== "cancelled",
  ).length;
}
