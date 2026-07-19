import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";

/* ============================================================
   Consulting Business — Types + Data Access Layer (Phase 1)
   All data flows through Supabase and is enforced by RLS.
   No hardcoded records.
   ============================================================ */

// ── Enums (mirror DB checks) ────────────────────────────────

export type SubscriptionPlan = "monthly" | "quarterly" | "annual";
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "expired"
  | "cancelled"
  | "suspended";

export type PaymentStatus =
  | "pending"
  | "requires_verification"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled"
  | "partial";

export type MemberRole =
  | "owner"
  | "administrator"
  | "manager"
  | "consultant"
  | "support_agent"
  | "finance_manager"
  | "content_manager"
  | "read_only";

export type MemberStatus = "active" | "suspended" | "invited" | "removed";

export type ClientApplicationStatus =
  | "new_lead"
  | "contacted"
  | "consultation_scheduled"
  | "documents_requested"
  | "documents_received"
  | "under_review"
  | "submitted"
  | "waiting_for_result"
  | "approved"
  | "rejected"
  | "travel_completed"
  | "cancelled"
  | "refunded";

export type ApplicationStatus =
  | "new"
  | "documents"
  | "processing"
  | "submitted"
  | "approved"
  | "rejected"
  | "completed";

export type FinalResult = "pending" | "success" | "unsuccessful" | "cancelled";

export type VerificationStatus = "pending" | "verified" | "rejected";

// ── Plan pricing (single source of truth) ───────────────────

export interface PlanInfo {
  id: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  months: number;
  savingsLabel?: string;
  badge?: string;
  features: string[];
}

export const CONSULTING_PLANS: PlanInfo[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: 150,
    currency: "USD",
    months: 1,
    features: [
      "Full consulting dashboard access",
      "Unlimited service packages",
      "Client & application management",
      "Up to 3 employee seats",
      "Email support",
    ],
  },
  {
    id: "quarterly",
    name: "Quarterly",
    price: 400,
    currency: "USD",
    months: 3,
    savingsLabel: "Save $50",
    badge: "Most Popular",
    features: [
      "Everything in Monthly",
      "Up to 10 employee seats",
      "Analytics & revenue reports",
      "Priority support",
      "Company public profile",
    ],
  },
  {
    id: "annual",
    name: "Annual",
    price: 1700,
    currency: "USD",
    months: 12,
    savingsLabel: "Save $100",
    badge: "Best Value",
    features: [
      "Everything in Quarterly",
      "Unlimited employee seats",
      "Advanced analytics & export",
      "Dedicated account manager",
      "API access (Phase 2)",
    ],
  },
];

export function getPlan(id: SubscriptionPlan): PlanInfo {
  return CONSULTING_PLANS.find((p) => p.id === id) ?? CONSULTING_PLANS[0];
}

/** Compute subscription end date from a start date and plan. */
export function computeEndDate(start: Date, plan: SubscriptionPlan): Date {
  const d = new Date(start);
  d.setMonth(d.getMonth() + getPlan(plan).months);
  return d;
}

// ── Row types ───────────────────────────────────────────────

export interface ConsultingCompany {
  id: string;
  owner_id: string;
  name: string;
  legal_name: string | null;
  registration_number: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  working_hours: string | null;
  supported_languages: string[] | null;
  destination_countries: string[] | null;
  years_experience: number;
  manager_full_name: string | null;
  manager_phone: string | null;
  manager_email: string | null;
  is_verified: boolean;
  verification_status: VerificationStatus;
  subscription_status: SubscriptionStatus | "none";
  subscription_plan: SubscriptionPlan | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultingSubscription {
  id: string;
  consulting_company_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  auto_renewal: boolean;
  amount: number;
  currency: string;
  payment_method_id: string | null;
  payment_customer_id: string | null;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ConsultingMember {
  id: string;
  consulting_company_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_by: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  /** Joined profile fields (optional) */
  profile?: {
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ConsultingClient {
  id: string;
  consulting_company_id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  service_id: string | null;
  destination_country: string | null;
  assigned_employee_id: string | null;
  purchase_date: string | null;
  payment_status: PaymentStatus;
  application_status: ClientApplicationStatus;
  final_result: FinalResult;
  last_activity_at: string;
  is_archived: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  /** Joined fields (optional) */
  assigned_employee?: { name: string | null; avatar_url: string | null } | null;
  service?: { title: string; price: number } | null;
}

export interface ConsultingClientNote {
  id: string;
  consulting_company_id: string;
  client_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  author?: { name: string | null; avatar_url: string | null } | null;
}

export interface ConsultingApplication {
  id: string;
  consulting_company_id: string;
  client_id: string;
  service_id: string | null;
  destination_country: string | null;
  application_type: string | null;
  assigned_employee_id: string | null;
  submission_date: string | null;
  expected_completion_date: string | null;
  status: ApplicationStatus;
  required_documents: Json;
  uploaded_documents: Json;
  internal_notes: string | null;
  client_visible_updates: string | null;
  final_decision: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client?: ConsultingClient | null;
  service?: { title: string; price: number } | null;
  assigned_employee?: { name: string | null; avatar_url: string | null } | null;
}

export interface ConsultingApplicationHistory {
  id: string;
  consulting_company_id: string;
  application_id: string;
  previous_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
  changed_by_profile?: { name: string | null; avatar_url: string | null } | null;
}

export interface ConsultingPackage {
  id: string;
  consulting_company_id: string;
  service_id: string | null;
  destination_country: string | null;
  estimated_processing_time: string | null;
  included_services: Json;
  required_documents: Json;
  what_client_receives: Json;
  who_this_is_for: string | null;
  refund_conditions: string | null;
  contact_info: Json;
  available_slots: number | null;
  faq: Json;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  service?: {
    id: string;
    title: string;
    description: string;
    cover_image: string | null;
    price: number;
    currency: string;
    category: string;
    is_active: boolean;
  } | null;
}

export interface ConsultingPayment {
  id: string;
  consulting_company_id: string;
  client_id: string | null;
  service_id: string | null;
  transaction_id: string;
  type: "subscription" | "package" | "refund";
  gross_amount: number;
  commission: number;
  net_amount: number;
  currency: string;
  payment_method_id: string | null;
  card_brand: string | null;
  card_last4: string | null;
  status: PaymentStatus;
  refund_status: string | null;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client?: { full_name: string } | null;
  service?: { title: string } | null;
}

export interface ConsultingInvitation {
  id: string;
  consulting_company_id: string;
  email: string;
  role: MemberRole;
  token: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Company ─────────────────────────────────────────────────

/** Find the consulting company a user owns or belongs to. */
export async function fetchMyConsultingCompany(
  userId: string,
): Promise<ConsultingCompany | null> {
  // Try by membership first (works for owners and employees)
  const { data: memberRow } = await supabase
    .from("consulting_members")
    .select("consulting_company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (memberRow?.consulting_company_id) {
    const { data, error } = await supabase
      .from("consulting_companies")
      .select("*")
      .eq("id", memberRow.consulting_company_id)
      .maybeSingle();
    if (error) console.error("fetchMyConsultingCompany error:", error);
    return data as unknown as ConsultingCompany | null;
  }

  // Fallback: owner_id match (covers companies created before member row)
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) console.error("fetchMyConsultingCompany (owner) error:", error);
  return data as unknown as ConsultingCompany | null;
}

/** Check if a user belongs to any consulting company; return member row. */
export async function fetchMyMembership(
  userId: string,
): Promise<ConsultingMember | null> {
  const { data, error } = await supabase
    .from("consulting_members")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) console.error("fetchMyMembership error:", error);
  return data as unknown as ConsultingMember | null;
}

// ── Onboarding (Checkout) ───────────────────────────────────

export interface NewCompanyInput {
  owner_id: string;
  name: string;
  legal_name?: string;
  registration_number?: string;
  country?: string;
  city?: string;
  address?: string;
  logo_url?: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  manager_full_name?: string;
  manager_phone?: string;
  manager_email?: string;
}

export interface NewSubscriptionInput {
  consulting_company_id: string;
  plan: SubscriptionPlan;
  status?: SubscriptionStatus;
  start_date?: string;
  end_date?: string;
  auto_renewal?: boolean;
  amount: number;
  currency?: string;
  payment_method_id?: string;
  payment_customer_id?: string;
  card_brand?: string;
  card_last4?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  created_by?: string;
}

/**
 * Create a consulting company, an active subscription, and an owner member
 * row in a single coordinated flow. Called from the Checkout success step.
 * RLS allows the owner to insert all three (owner_id = auth.uid()).
 */
export async function createConsultingAccount(input: {
  company: NewCompanyInput;
  subscription: NewSubscriptionInput;
  ownerId: string;
}): Promise<{ company: ConsultingCompany | null; error: string | null }> {
  const { company: companyInput, subscription: subInput, ownerId } = input;

  // 1. Create company
  const { data: company, error: companyErr } = await supabase
    .from("consulting_companies")
    .insert({
      owner_id: ownerId,
      name: companyInput.name,
      legal_name: companyInput.legal_name ?? null,
      registration_number: companyInput.registration_number ?? null,
      country: companyInput.country ?? null,
      city: companyInput.city ?? null,
      address: companyInput.address ?? null,
      logo_url: companyInput.logo_url ?? null,
      description: companyInput.description ?? null,
      contact_email: companyInput.contact_email ?? null,
      contact_phone: companyInput.contact_phone ?? null,
      website: companyInput.website ?? null,
      manager_full_name: companyInput.manager_full_name ?? null,
      manager_phone: companyInput.manager_phone ?? null,
      manager_email: companyInput.manager_email ?? null,
      verification_status: "pending",
      subscription_status: "active",
      subscription_plan: subInput.plan,
      subscription_start_date: subInput.start_date ?? new Date().toISOString(),
      subscription_end_date: subInput.end_date ?? computeEndDate(new Date(), subInput.plan).toISOString(),
    })
    .select("*")
    .single();

  if (companyErr || !company) {
    console.error("createConsultingAccount: company insert failed:", companyErr);
    return { company: null, error: companyErr?.message ?? "Failed to create company" };
  }

  const companyId = (company as ConsultingCompany).id;

  // 2. Create subscription
  const { error: subErr } = await supabase.from("consulting_subscriptions").insert({
    consulting_company_id: companyId,
    plan: subInput.plan,
    status: subInput.status ?? "active",
    start_date: subInput.start_date ?? new Date().toISOString(),
    end_date: subInput.end_date ?? computeEndDate(new Date(), subInput.plan).toISOString(),
    auto_renewal: subInput.auto_renewal ?? true,
    amount: subInput.amount,
    currency: subInput.currency ?? "USD",
    payment_method_id: subInput.payment_method_id ?? null,
    payment_customer_id: subInput.payment_customer_id ?? null,
    card_brand: subInput.card_brand ?? null,
    card_last4: subInput.card_last4 ?? null,
    card_exp_month: subInput.card_exp_month ?? null,
    card_exp_year: subInput.card_exp_year ?? null,
    created_by: ownerId,
  });

  if (subErr) console.error("createConsultingAccount: subscription insert failed:", subErr);

  // 3. Create owner member row
  const { error: memberErr } = await supabase.from("consulting_members").insert({
    consulting_company_id: companyId,
    user_id: ownerId,
    role: "owner",
    status: "active",
    invited_by: ownerId,
  });

  if (memberErr) console.error("createConsultingAccount: member insert failed:", memberErr);

  // 4. Record payment
  const { error: payErr } = await supabase.from("consulting_payments").insert({
    consulting_company_id: companyId,
    transaction_id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    type: "subscription",
    gross_amount: subInput.amount,
    commission: 0,
    net_amount: subInput.amount,
    currency: subInput.currency ?? "USD",
    payment_method_id: subInput.payment_method_id ?? null,
    card_brand: subInput.card_brand ?? null,
    card_last4: subInput.card_last4 ?? null,
    status: "paid",
    paid_at: new Date().toISOString(),
    created_by: ownerId,
  });

  if (payErr) console.error("createConsultingAccount: payment insert failed:", payErr);

  return { company: company as ConsultingCompany, error: null };
}

// ── Clients ─────────────────────────────────────────────────

export async function fetchClients(
  companyId: string,
  opts: {
    search?: string;
    status?: ClientApplicationStatus | "all";
    employeeId?: string;
    page?: number;
    pageSize?: number;
    archived?: boolean;
  } = {},
): Promise<{ clients: ConsultingClient[]; total: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("consulting_clients")
    .select(
      "*, assigned_employee:profiles!consulting_clients_assigned_employee_id_fkey(name,avatar_url), service:services!consulting_clients_service_id_fkey(title,price)",
      { count: "exact" },
    )
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });

  if (opts.archived === undefined) {
    query = query.eq("is_archived", false);
  } else {
    query = query.eq("is_archived", opts.archived);
  }

  if (opts.status && opts.status !== "all") {
    query = query.eq("application_status", opts.status);
  }
  if (opts.employeeId) {
    query = query.eq("assigned_employee_id", opts.employeeId);
  }
  if (opts.search?.trim()) {
    query = query.or(`full_name.ilike.%${opts.search}%,email.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) console.error("fetchClients error:", error);
  return { clients: (data ?? []) as unknown as ConsultingClient[], total: count ?? 0 };
}

export async function fetchClientById(clientId: string): Promise<ConsultingClient | null> {
  const { data, error } = await supabase
    .from("consulting_clients")
    .select(
      "*, assigned_employee:profiles!consulting_clients_assigned_employee_id_fkey(name,avatar_url), service:services!consulting_clients_service_id_fkey(title,price)",
    )
    .eq("id", clientId)
    .maybeSingle();
  if (error) console.error("fetchClientById error:", error);
  return data as unknown as ConsultingClient | null;
}

export async function createClient(
  companyId: string,
  input: Partial<ConsultingClient> & { full_name: string },
  createdBy: string,
): Promise<ConsultingClient | null> {
  const { data, error } = await supabase
    .from("consulting_clients")
    .insert({
      consulting_company_id: companyId,
      full_name: input.full_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      photo_url: input.photo_url ?? null,
      service_id: input.service_id ?? null,
      destination_country: input.destination_country ?? null,
      assigned_employee_id: input.assigned_employee_id ?? null,
      application_status: input.application_status ?? "new_lead",
      payment_status: input.payment_status ?? "pending",
      final_result: input.final_result ?? "pending",
      metadata: input.metadata ?? {},
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) {
    console.error("createClient error:", error);
    throw error;
  }
  return data as unknown as ConsultingClient;
}

export async function updateClient(
  clientId: string,
  input: Partial<ConsultingClient>,
): Promise<ConsultingClient | null> {
  const { data, error } = await supabase
    .from("consulting_clients")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", clientId)
    .select("*")
    .single();
  if (error) {
    console.error("updateClient error:", error);
    throw error;
  }
  return data as unknown as ConsultingClient;
}

export async function archiveClient(clientId: string, archive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_clients")
    .update({ is_archived: archive, updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) {
    console.error("archiveClient error:", error);
    return false;
  }
  return true;
}

// ── Client notes ────────────────────────────────────────────

export async function fetchClientNotes(clientId: string): Promise<ConsultingClientNote[]> {
  const { data, error } = await supabase
    .from("consulting_client_notes")
    .select("*, author:profiles!consulting_client_notes_author_id_fkey(name,avatar_url)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) console.error("fetchClientNotes error:", error);
  return (data ?? []) as unknown as ConsultingClientNote[];
}

export async function addClientNote(
  companyId: string,
  clientId: string,
  authorId: string,
  body: string,
  isInternal = true,
): Promise<ConsultingClientNote | null> {
  const { data, error } = await supabase
    .from("consulting_client_notes")
    .insert({
      consulting_company_id: companyId,
      client_id: clientId,
      author_id: authorId,
      body,
      is_internal: isInternal,
    })
    .select("*")
    .single();
  if (error) {
    console.error("addClientNote error:", error);
    throw error;
  }
  return data as unknown as ConsultingClientNote;
}

// ── Applications ────────────────────────────────────────────

export async function fetchApplications(
  companyId: string,
  opts: { status?: ApplicationStatus | "all"; search?: string; view?: "all" | "assigned" } = {},
): Promise<ConsultingApplication[]> {
  let query = supabase
    .from("consulting_applications")
    .select(
      "*, client:consulting_clients!consulting_applications_client_id_fkey(*), service:services!consulting_applications_service_id_fkey(title,price), assigned_employee:profiles!consulting_applications_assigned_employee_id_fkey(name,avatar_url)",
    )
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });

  if (opts.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }
  if (opts.search?.trim()) {
    query = query.or(`application_type.ilike.%${opts.search}%,destination_country.ilike.%${opts.search}%`);
  }

  const { data, error } = await query;
  if (error) console.error("fetchApplications error:", error);
  return (data ?? []) as unknown as ConsultingApplication[];
}

export async function createApplication(
  companyId: string,
  input: Partial<ConsultingApplication> & { client_id: string },
  createdBy: string,
): Promise<ConsultingApplication | null> {
  const { data, error } = await supabase
    .from("consulting_applications")
    .insert({
      consulting_company_id: companyId,
      client_id: input.client_id,
      service_id: input.service_id ?? null,
      destination_country: input.destination_country ?? null,
      application_type: input.application_type ?? null,
      assigned_employee_id: input.assigned_employee_id ?? null,
      submission_date: input.submission_date ?? null,
      expected_completion_date: input.expected_completion_date ?? null,
      status: input.status ?? "new",
      required_documents: input.required_documents ?? [],
      uploaded_documents: input.uploaded_documents ?? [],
      internal_notes: input.internal_notes ?? null,
      client_visible_updates: input.client_visible_updates ?? null,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) {
    console.error("createApplication error:", error);
    throw error;
  }
  return data as unknown as ConsultingApplication;
}

/** Update application status and append to history. */
export async function updateApplicationStatus(
  application: ConsultingApplication,
  newStatus: ApplicationStatus,
  changedBy: string,
  note?: string,
): Promise<void> {
  const previousStatus = application.status;
  if (previousStatus === newStatus) return;

  const { error: updateErr } = await supabase
    .from("consulting_applications")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", application.id);
  if (updateErr) {
    console.error("updateApplicationStatus update error:", updateErr);
    throw updateErr;
  }

  const { error: histErr } = await supabase.from("consulting_application_history").insert({
    consulting_company_id: application.consulting_company_id,
    application_id: application.id,
    previous_status: previousStatus,
    new_status: newStatus,
    changed_by: changedBy,
    note: note ?? null,
  });
  if (histErr) console.error("updateApplicationStatus history error:", histErr);
}

export async function fetchApplicationHistory(
  applicationId: string,
): Promise<ConsultingApplicationHistory[]> {
  const { data, error } = await supabase
    .from("consulting_application_history")
    .select("*, changed_by_profile:profiles!consulting_application_history_changed_by_fkey(name,avatar_url)")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) console.error("fetchApplicationHistory error:", error);
  return (data ?? []) as unknown as ConsultingApplicationHistory[];
}

// ── Packages ────────────────────────────────────────────────

export async function fetchCompanyPackages(companyId: string): Promise<ConsultingPackage[]> {
  const { data, error } = await supabase
    .from("consulting_packages")
    .select(
      "*, service:services!consulting_packages_service_id_fkey(id,title,description,cover_image,price,currency,category,is_active)",
    )
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) console.error("fetchCompanyPackages error:", error);
  return (data ?? []) as unknown as ConsultingPackage[];
}

export async function fetchPackageById(packageId: string): Promise<ConsultingPackage | null> {
  const { data, error } = await supabase
    .from("consulting_packages")
    .select(
      "*, service:services!consulting_packages_service_id_fkey(id,title,description,cover_image,price,currency,category,is_active)",
    )
    .eq("id", packageId)
    .maybeSingle();
  if (error) console.error("fetchPackageById error:", error);
  return data as unknown as ConsultingPackage | null;
}

export async function upsertPackage(
  companyId: string,
  serviceId: string,
  input: Partial<ConsultingPackage>,
  createdBy: string,
  existingId?: string,
): Promise<ConsultingPackage | null> {
  const payload = {
    consulting_company_id: companyId,
    service_id: serviceId,
    destination_country: input.destination_country ?? null,
    estimated_processing_time: input.estimated_processing_time ?? null,
    included_services: input.included_services ?? [],
    required_documents: input.required_documents ?? [],
    what_client_receives: input.what_client_receives ?? [],
    who_this_is_for: input.who_this_is_for ?? null,
    refund_conditions: input.refund_conditions ?? null,
    contact_info: input.contact_info ?? {},
    available_slots: input.available_slots ?? null,
    faq: input.faq ?? [],
    is_published: input.is_published ?? false,
    created_by: createdBy,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from("consulting_packages")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as ConsultingPackage;
  }

  const { data, error } = await supabase
    .from("consulting_packages")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as ConsultingPackage;
}

export async function deletePackage(packageId: string): Promise<boolean> {
  const { error } = await supabase.from("consulting_packages").delete().eq("id", packageId);
  if (error) {
    console.error("deletePackage error:", error);
    return false;
  }
  return true;
}

// ── Members / Employees ─────────────────────────────────────

export async function fetchMembers(companyId: string): Promise<ConsultingMember[]> {
  const { data, error } = await supabase
    .from("consulting_members")
    .select("*, profile:profiles!consulting_members_user_id_fkey(name,email,avatar_url)")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: true });
  if (error) console.error("fetchMembers error:", error);
  return (data ?? []) as unknown as ConsultingMember[];
}

export async function updateMemberRole(
  memberId: string,
  role: MemberRole,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_members")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) {
    console.error("updateMemberRole error:", error);
    return false;
  }
  return true;
}

export async function updateMemberStatus(
  memberId: string,
  status: MemberStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_members")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) {
    console.error("updateMemberStatus error:", error);
    return false;
  }
  return true;
}

export async function inviteMember(
  companyId: string,
  email: string,
  role: MemberRole,
  invitedBy: string,
): Promise<ConsultingInvitation | null> {
  const { data, error } = await supabase
    .from("consulting_invitations")
    .insert({
      consulting_company_id: companyId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: invitedBy,
    })
    .select("*")
    .single();
  if (error) {
    console.error("inviteMember error:", error);
    throw error;
  }
  return data as unknown as ConsultingInvitation;
}

export async function fetchInvitations(companyId: string): Promise<ConsultingInvitation[]> {
  const { data, error } = await supabase
    .from("consulting_invitations")
    .select("*")
    .eq("consulting_company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) console.error("fetchInvitations error:", error);
  return (data ?? []) as unknown as ConsultingInvitation[];
}

export async function revokeInvitation(invitationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", invitationId);
  if (error) {
    console.error("revokeInvitation error:", error);
    return false;
  }
  return true;
}

// ── Payments ────────────────────────────────────────────────

export async function fetchPayments(
  companyId: string,
  opts: { status?: PaymentStatus | "all"; page?: number; pageSize?: number } = {},
): Promise<{ payments: ConsultingPayment[]; total: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("consulting_payments")
    .select(
      "*, client:consulting_clients!consulting_payments_client_id_fkey(full_name), service:services!consulting_payments_service_id_fkey(title)",
      { count: "exact" },
    )
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });

  if (opts.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) console.error("fetchPayments error:", error);
  return { payments: (data ?? []) as unknown as ConsultingPayment[], total: count ?? 0 };
}

// ── Analytics helpers ───────────────────────────────────────

export interface DashboardStats {
  totalClients: number;
  newThisWeek: number;
  newThisMonth: number;
  activeApplications: number;
  successfulClients: number;
  unsuccessfulClients: number;
  pendingClients: number;
  totalRevenue: number;
  monthlyRevenue: number;
  annualRevenue: number;
  previousTotalClients: number;
  previousNewThisWeek: number;
  previousNewThisMonth: number;
}

export async function fetchDashboardStats(companyId: string): Promise<DashboardStats> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfPrevWeek = new Date(startOfWeek);
  startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Clients
  const { count: totalClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false);

  const { count: newThisWeek } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false)
    .gte("created_at", startOfWeek.toISOString());

  const { count: newThisMonth } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false)
    .gte("created_at", startOfMonth.toISOString());

  const { count: previousNewThisWeek } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false)
    .gte("created_at", startOfPrevWeek.toISOString())
    .lt("created_at", startOfWeek.toISOString());

  const { count: previousNewThisMonth } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false)
    .gte("created_at", startOfPrevMonth.toISOString())
    .lt("created_at", startOfMonth.toISOString());

  // Applications
  const { count: activeApplications } = await supabase
    .from("consulting_applications")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .in("status", ["new", "documents", "processing", "submitted"]);

  // Final results (from clients)
  const { count: successfulClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "success");

  const { count: unsuccessfulClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "unsuccessful");

  const { count: pendingClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "pending");

  // Revenue
  const { data: paidPayments } = await supabase
    .from("consulting_payments")
    .select("gross_amount,paid_at")
    .eq("consulting_company_id", companyId)
    .eq("status", "paid");

  const paid = (paidPayments ?? []) as unknown as { gross_amount: number; paid_at: string | null }[];
  const totalRevenue = paid.reduce((s, p) => s + Number(p.gross_amount), 0);
  const monthlyRevenue = paid
    .filter((p) => p.paid_at && new Date(p.paid_at) >= startOfMonth)
    .reduce((s, p) => s + Number(p.gross_amount), 0);
  const annualRevenue = paid
    .filter((p) => p.paid_at && new Date(p.paid_at) >= startOfYear)
    .reduce((s, p) => s + Number(p.gross_amount), 0);

  return {
    totalClients: totalClients ?? 0,
    newThisWeek: newThisWeek ?? 0,
    newThisMonth: newThisMonth ?? 0,
    activeApplications: activeApplications ?? 0,
    successfulClients: successfulClients ?? 0,
    unsuccessfulClients: unsuccessfulClients ?? 0,
    pendingClients: pendingClients ?? 0,
    totalRevenue,
    monthlyRevenue,
    annualRevenue,
    previousTotalClients: 0,
    previousNewThisWeek: previousNewThisWeek ?? 0,
    previousNewThisMonth: previousNewThisMonth ?? 0,
  };
}

/** Monthly aggregation for the last N months (clients + revenue). */
export async function fetchMonthlySeries(
  companyId: string,
  months = 6,
): Promise<{ label: string; clients: number; revenue: number }[]> {
  const out: { label: string; clients: number; revenue: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = start.toLocaleDateString("en-US", { month: "short" });

    const { count: clients } = await supabase
      .from("consulting_clients")
      .select("*", { count: "exact", head: true })
      .eq("consulting_company_id", companyId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    const { data: pays } = await supabase
      .from("consulting_payments")
      .select("gross_amount,paid_at")
      .eq("consulting_company_id", companyId)
      .eq("status", "paid")
      .gte("paid_at", start.toISOString())
      .lt("paid_at", end.toISOString());

    const revenue = ((pays ?? []) as unknown as { gross_amount: number }[]).reduce(
      (s, p) => s + Number(p.gross_amount),
      0,
    );

    out.push({ label, clients: clients ?? 0, revenue });
  }
  return out;
}

/** Group clients by a field for chart rendering. */
export async function fetchClientGroupBy(
  companyId: string,
  field: "service_id" | "destination_country" | "assigned_employee_id",
): Promise<{ label: string; count: number }[]> {
  const { data, error } = await supabase
    .from("consulting_clients")
    .select(`${field}, service:services!consulting_clients_service_id_fkey(title)`)
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false);

  if (error) {
    console.error("fetchClientGroupBy error:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const value = row[field];
    let label = "Unassigned";
    if (field === "service_id" && value) {
      label = (row.service as { title?: string } | null)?.title ?? "Unknown service";
    } else if (value) {
      label = String(value);
    }
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Application status distribution. */
export async function fetchApplicationStatusDistribution(
  companyId: string,
): Promise<{ status: ApplicationStatus; count: number }[]> {
  const { data, error } = await supabase
    .from("consulting_applications")
    .select("status")
    .eq("consulting_company_id", companyId);
  if (error) {
    console.error("fetchApplicationStatusDistribution error:", error);
    return [];
  }
  const rows = (data ?? []) as unknown as { status: ApplicationStatus }[];
  const buckets = new Map<ApplicationStatus, number>();
  for (const r of rows) {
    buckets.set(r.status, (buckets.get(r.status) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([status, count]) => ({ status, count }));
}

// ── Storage helper (logos, documents) ───────────────────────

export async function uploadConsultingAsset(
  file: File,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("consulting")
    .upload(path, file, { upsert: true });
  if (error) {
    console.error("uploadConsultingAsset error:", error);
    return null;
  }
  const { data: pub } = supabase.storage.from("consulting").getPublicUrl(data.path);
  return pub.publicUrl;
}
