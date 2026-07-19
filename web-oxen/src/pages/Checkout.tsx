import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ShieldCheck,
  CreditCard,
  Building2,
  Phone,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import {
  CONSULTING_PLANS,
  computeEndDate,
  createConsultingAccount,
  getPlan,
  uploadConsultingAsset,
  type SubscriptionPlan,
} from "@/lib/consulting";
import {
  tokenizeCard,
  sendOtp,
  verifyOtp,
  maskCard,
  detectBrand,
  OTP_RESEND_SECONDS,
  TEST_OTP,
  type OtpSession,
  type TokenizedCard,
  type CardInput,
} from "@/lib/payment";
import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { Field, SelectField } from "@/components/consulting/Field";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

type StepId = 1 | 2 | 3 | 4;

const STEPS: { id: StepId; label: string; icon: typeof Building2 }[] = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "Payment", icon: CreditCard },
  { id: 3, label: "Verify", icon: Phone },
  { id: 4, label: "Confirm", icon: ShieldCheck },
];

interface CompanyForm {
  name: string;
  legal_name: string;
  registration_number: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  manager_full_name: string;
  manager_phone: string;
  manager_email: string;
  description: string;
}

const EMPTY_COMPANY: CompanyForm = {
  name: "",
  legal_name: "",
  registration_number: "",
  country: "",
  city: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  manager_full_name: "",
  manager_phone: "",
  manager_email: "",
  description: "",
};

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, ready: authReady } = useAuth();
  const { refresh } = useConsulting();

  const planParam = (params.get("plan") as SubscriptionPlan | null) ?? "quarterly";
  const plan = getPlan(CONSULTING_PLANS.some((p) => p.id === planParam) ? planParam : "quarterly");

  useSEO({ title: "Checkout | OXEN Consulting", description: "Subscribe to OXEN Consulting." });

  const [step, setStep] = useState<StepId>(1);
  const [company, setCompany] = useState<CompanyForm>(EMPTY_COMPANY);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyForm, string>>>({});

  const [card, setCard] = useState<CardInput>({
    cardholder: "",
    number: "",
    exp: "",
    cvv: "",
    billingCountry: "",
    billingAddress: "",
  });
  const [cardError, setCardError] = useState<string | null>(null);
  const [tokenized, setTokenized] = useState<TokenizedCard | null>(null);
  const [tokenizing, setTokenizing] = useState(false);

  const [otpSession, setOtpSession] = useState<OtpSession | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [agreedFinal, setAgreedFinal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auth gate: guests must sign in to submit (but can view the page)
  useEffect(() => {
    if (authReady && (!user || user.isGuest)) {
      // Allow viewing, but they'll be redirected at submit
    }
  }, [authReady, user]);

  // Resend timer
  useEffect(() => {
    if (resendIn <= 0) {
      if (resendTimer.current) {
        clearInterval(resendTimer.current);
        resendTimer.current = null;
      }
      return;
    }
    if (!resendTimer.current) {
      resendTimer.current = setInterval(() => {
        setResendIn((s) => Math.max(0, s - 1));
      }, 1000);
    }
    return () => {
      if (resendIn <= 0 && resendTimer.current) {
        clearInterval(resendTimer.current);
        resendTimer.current = null;
      }
    };
  }, [resendIn]);

  const endDate = useMemo(() => computeEndDate(new Date(), plan.id), [plan.id]);

  // ── Step validation ──────────────────────────────────────

  const validateCompany = useCallback((): boolean => {
    const e: Partial<Record<keyof CompanyForm, string>> = {};
    if (!company.name.trim()) e.name = "Company name is required";
    if (!company.legal_name.trim()) e.legal_name = "Legal name is required";
    if (!company.country.trim()) e.country = "Country is required";
    if (!company.city.trim()) e.city = "City is required";
    if (!company.address.trim()) e.address = "Office address is required";
    if (!company.phone.trim()) e.phone = "Phone is required";
    if (!company.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email)) e.email = "Invalid email";
    if (!company.manager_full_name.trim()) e.manager_full_name = "Manager name is required";
    if (!company.manager_phone.trim()) e.manager_phone = "Manager phone is required";
    if (!company.manager_email.trim()) e.manager_email = "Manager email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.manager_email)) e.manager_email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [company]);

  const handleLogoUpload = useCallback(async (file: File) => {
    setUploadingLogo(true);
    try {
      const url = await uploadConsultingAsset(file, `logos/${Date.now()}_${file.name}`);
      if (url) {
        setLogoUrl(url);
        toast({ title: "Logo uploaded" });
      } else {
        toast({ title: "Logo upload failed", variant: "destructive" });
      }
    } finally {
      setUploadingLogo(false);
    }
  }, []);

  // ── Step transitions ─────────────────────────────────────

  const goNext = useCallback(async () => {
    if (step === 1) {
      if (!validateCompany()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      // Tokenize card
      if (!user || user.isGuest) {
        navigate(`/auth?redirect=${encodeURIComponent(`/checkout?plan=${plan.id}`)}`);
        return;
      }
      setCardError(null);
      setTokenizing(true);
      try {
        const tok = await tokenizeCard(card);
        setTokenized(tok);
        setStep(3);
        // Auto-send OTP on entering step 3
        const session = await sendOtp(company.manager_phone || company.phone);
        setOtpSession(session);
        setResendIn(OTP_RESEND_SECONDS);
      } catch (err) {
        setCardError(err instanceof Error ? err.message : "Card validation failed");
      } finally {
        setTokenizing(false);
      }
      return;
    }
    if (step === 3) {
      setOtpError(null);
      if (!otpSession) {
        setOtpError("Please request a code first");
        return;
      }
      setVerifying(true);
      try {
        const res = await verifyOtp(otpSession, otpCode);
        if (!res.ok) {
          const reason = (res as { ok: false; reason: "incorrect" | "expired" }).reason;
          setOtpError(reason === "expired" ? "Code expired. Request a new one." : "Incorrect code. Try again.");
          return;
        }
        setStep(4);
      } finally {
        setVerifying(false);
      }
      return;
    }
  }, [step, validateCompany, card, user, company, otpSession, otpCode, navigate, plan.id]);

  const goBack = useCallback(() => {
    if (step === 1) {
      navigate("/explore");
      return;
    }
    setStep((s) => (s - 1) as StepId);
  }, [step, navigate]);

  const handleResendOtp = useCallback(async () => {
    if (resendIn > 0 || !company.manager_phone) return;
    setOtpError(null);
    const session = await sendOtp(company.manager_phone || company.phone);
    setOtpSession(session);
    setResendIn(OTP_RESEND_SECONDS);
    toast({ title: "Code resent" });
  }, [resendIn, company.manager_phone, company.phone]);

  // ── Final submission ─────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!user || user.isGuest) {
      navigate(`/auth?redirect=${encodeURIComponent(`/checkout?plan=${plan.id}`)}`);
      return;
    }
    if (!agreedFinal) {
      toast({ title: "Please accept the terms to confirm", variant: "destructive" });
      return;
    }
    if (!tokenized) {
      toast({ title: "Payment method missing", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const startDate = new Date();
      const { error } = await createConsultingAccount({
        ownerId: user.id,
        company: {
          owner_id: user.id,
          name: company.name,
          legal_name: company.legal_name,
          registration_number: company.registration_number,
          country: company.country,
          city: company.city,
          address: company.address,
          logo_url: logoUrl,
          description: company.description,
          contact_email: company.email,
          contact_phone: company.phone,
          website: company.website || undefined,
          manager_full_name: company.manager_full_name,
          manager_phone: company.manager_phone,
          manager_email: company.manager_email,
        },
        subscription: {
          consulting_company_id: "", // filled by createConsultingAccount
          plan: plan.id,
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renewal: true,
          amount: plan.price,
          currency: plan.currency,
          payment_method_id: tokenized.paymentMethodId,
          payment_customer_id: tokenized.customerId,
          card_brand: tokenized.brand,
          card_last4: tokenized.last4,
          card_exp_month: tokenized.expMonth,
          card_exp_year: tokenized.expYear,
          created_by: user.id,
        },
      });

      if (error) {
        toast({ title: error, variant: "destructive" });
        return;
      }

      refresh();
      toast({
        title: "Your consulting company account has been activated successfully.",
      });
      navigate("/consulting/dashboard", { replace: true });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Activation failed",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, agreedFinal, tokenized, company, logoUrl, plan, endDate, navigate, refresh]);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-12 pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={springIn} className="mb-6">
        <button
          onClick={() => navigate("/explore")}
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to plans
        </button>
        <h1 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {plan.name} plan · ${plan.price.toLocaleString()} / {plan.months} month{plan.months > 1 ? "s" : ""}
        </p>
      </motion.div>

      {/* Stepper */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.05 }}
        className="mb-8 flex items-center gap-2"
      >
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === s.id;
          const done = step > s.id;
          return (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                  active && "border-primary bg-primary/15 text-primary",
                  done && "border-primary/40 bg-primary/10 text-primary",
                  !active && !done && "border-white/[0.06] bg-white/[0.02] text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:block",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px flex-1", done ? "bg-primary/40" : "bg-white/[0.06]")} />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* TEST MODE banner */}
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-xs text-amber-300/90">
          <span className="font-bold">TEST MODE</span> — no real charges. Use card{" "}
          <span className="font-mono font-semibold">4242 4242 4242 4242</span> and OTP{" "}
          <span className="font-mono font-semibold">{TEST_OTP}</span>.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1 — Company Information */}
        {step === 1 && (
          <motion.section
            key="s1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="space-y-4"
          >
            <div className="glass rounded-2xl p-5">
              <h2 className="mb-4 font-display text-base font-bold">Company Information</h2>
              <div className="space-y-3">
                <Field
                  label="Consulting company name"
                  value={company.name}
                  onChange={(v) => setCompany((c) => ({ ...c, name: v }))}
                  placeholder="Global Visa Consulting"
                  required
                  error={errors.name}
                />
                <Field
                  label="Legal company name"
                  value={company.legal_name}
                  onChange={(v) => setCompany((c) => ({ ...c, legal_name: v }))}
                  placeholder="Global Visa Consulting LLC"
                  required
                  error={errors.legal_name}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Registration number"
                    value={company.registration_number}
                    onChange={(v) => setCompany((c) => ({ ...c, registration_number: v }))}
                    placeholder="123456789"
                  />
                  <Field
                    label="Country"
                    value={company.country}
                    onChange={(v) => setCompany((c) => ({ ...c, country: v }))}
                    placeholder="United Arab Emirates"
                    required
                    error={errors.country}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="City"
                    value={company.city}
                    onChange={(v) => setCompany((c) => ({ ...c, city: v }))}
                    placeholder="Dubai"
                    required
                    error={errors.city}
                  />
                  <Field
                    label="Office address"
                    value={company.address}
                    onChange={(v) => setCompany((c) => ({ ...c, address: v }))}
                    placeholder="Sheikh Zayed Rd, Dubai"
                    required
                    error={errors.address}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Company phone"
                    value={company.phone}
                    onChange={(v) => setCompany((c) => ({ ...c, phone: v }))}
                    type="tel"
                    placeholder="+971 4 123 4567"
                    required
                    error={errors.phone}
                  />
                  <Field
                    label="Company email"
                    value={company.email}
                    onChange={(v) => setCompany((c) => ({ ...c, email: v }))}
                    type="email"
                    placeholder="info@globalvisa.com"
                    required
                    error={errors.email}
                  />
                </div>
                <Field
                  label="Website (optional)"
                  value={company.website}
                  onChange={(v) => setCompany((c) => ({ ...c, website: v }))}
                  type="url"
                  placeholder="https://globalvisa.com"
                />

                {/* Logo upload */}
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Company logo</span>
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <label className="glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground transition hover:border-primary/30">
                      {uploadingLogo ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {logoUrl ? "Replace" : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleLogoUpload(f);
                        }}
                      />
                    </label>
                    {logoUrl && (
                      <button
                        onClick={() => setLogoUrl(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="mb-4 font-display text-base font-bold">Manager / Owner</h2>
              <div className="space-y-3">
                <Field
                  label="Manager full name"
                  value={company.manager_full_name}
                  onChange={(v) => setCompany((c) => ({ ...c, manager_full_name: v }))}
                  placeholder="Ahmed Al Mansoori"
                  required
                  error={errors.manager_full_name}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Manager phone"
                    value={company.manager_phone}
                    onChange={(v) => setCompany((c) => ({ ...c, manager_phone: v }))}
                    type="tel"
                    placeholder="+971 50 123 4567"
                    required
                    error={errors.manager_phone}
                  />
                  <Field
                    label="Manager email"
                    value={company.manager_email}
                    onChange={(v) => setCompany((c) => ({ ...c, manager_email: v }))}
                    type="email"
                    placeholder="ahmed@globalvisa.com"
                    required
                    error={errors.manager_email}
                  />
                </div>
                <Field
                  label="Short company description"
                  value={company.description}
                  onChange={(v) => setCompany((c) => ({ ...c, description: v }))}
                  type="textarea"
                  placeholder="We help clients secure visas and relocate smoothly…"
                />
              </div>
            </div>
          </motion.section>
        )}

        {/* Step 2 — Card Information */}
        {step === 2 && (
          <motion.section
            key="s2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="space-y-4"
          >
            <div className="glass rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-bold">Card Information</h2>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Test Mode
                </span>
              </div>
              <div className="space-y-3">
                <Field
                  label="Cardholder name"
                  value={card.cardholder}
                  onChange={(v) => setCard((c) => ({ ...c, cardholder: v }))}
                  placeholder="AHMED AL MANSOORI"
                />
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Card number</span>
                  <div className="relative">
                    <input
                      value={card.number}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 19);
                        const formatted = raw.replace(/(.{4})/g, "$1 ").trim();
                        setCard((c) => ({ ...c, number: formatted }));
                      }}
                      placeholder="4242 4242 4242 4242"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    {card.number && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground">
                        {detectBrand(card.number)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Expiration (MM/YY)"
                    value={card.exp}
                    onChange={(v) => {
                      const raw = v.replace(/\D/g, "").slice(0, 4);
                      const formatted = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
                      setCard((c) => ({ ...c, exp: formatted }));
                    }}
                    placeholder="12/28"
                  />
                  <Field
                    label="CVV"
                    value={card.cvv}
                    onChange={(v) => setCard((c) => ({ ...c, cvv: v.replace(/\D/g, "").slice(0, 4) }))}
                    placeholder="123"
                  />
                </div>
                <Field
                  label="Billing country"
                  value={card.billingCountry}
                  onChange={(v) => setCard((c) => ({ ...c, billingCountry: v }))}
                  placeholder="United Arab Emirates"
                />
                <Field
                  label="Billing address"
                  value={card.billingAddress}
                  onChange={(v) => setCard((c) => ({ ...c, billingAddress: v }))}
                  placeholder="Sheikh Zayed Rd, Dubai"
                />
              </div>
              {cardError && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {cardError}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Tokenized in-browser. We never store your raw card number or CVV.
              </div>
            </div>
          </motion.section>
        )}

        {/* Step 3 — Phone Verification */}
        {step === 3 && (
          <motion.section
            key="s3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="space-y-4"
          >
            <div className="glass rounded-2xl p-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Phone className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-base font-bold">Verify your phone</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                We sent a 6-digit code to{" "}
                <span className="font-semibold text-foreground">
                  {company.manager_phone || company.phone}
                </span>
              </p>

              {/* Test-mode callout */}
              <div className="mx-auto mt-4 max-w-xs rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300/90">
                <span className="font-bold">TEST MODE</span> — your code is{" "}
                <span className="font-mono font-bold">{otpSession?.code ?? TEST_OTP}</span>
              </div>

              <div className="mx-auto mt-5 flex max-w-xs justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpCode[i] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 1);
                      const next = otpCode.split("");
                      next[i] = val;
                      setOtpCode(next.join(""));
                      if (val && i < 5) {
                        document.getElementById(`otp-${i + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otpCode[i] && i > 0) {
                        document.getElementById(`otp-${i - 1}`)?.focus();
                      }
                    }}
                    className="h-12 w-10 rounded-xl border border-input bg-background/50 text-center font-display text-lg font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                ))}
              </div>

              {otpError && (
                <div className="mx-auto mt-3 flex max-w-xs items-center justify-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {otpError}
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-2 text-xs">
                {resendIn > 0 ? (
                  <span className="text-muted-foreground">
                    Resend code in {resendIn}s
                  </span>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    className="flex items-center gap-1.5 font-semibold text-primary transition hover:opacity-80"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Resend code
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* Step 4 — Confirmation */}
        {step === 4 && (
          <motion.section
            key="s4"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="space-y-4"
          >
            <div className="glass rounded-2xl p-5">
              <h2 className="mb-4 font-display text-base font-bold">Review & confirm</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Company</dt>
                  <dd className="text-right font-semibold text-foreground">{company.name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="text-right font-semibold text-foreground">{plan.name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {plan.months} month{plan.months > 1 ? "s" : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Renewal date</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {endDate.toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Card</dt>
                  <dd className="text-right font-mono font-semibold text-foreground">
                    {tokenized ? `${tokenized.brand} ${maskCard(tokenized.last4)}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-3">
                  <dt className="font-display text-base font-bold">Total</dt>
                  <dd className="font-display text-base font-extrabold text-primary">
                    ${plan.price.toLocaleString()} {plan.currency}
                  </dd>
                </div>
              </dl>

              <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <input
                  type="checkbox"
                  checked={agreedFinal}
                  onChange={(e) => setAgreedFinal(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  I authorize OXEN to charge my card for the {plan.name} subscription and accept the{" "}
                  <span className="font-semibold text-primary">Terms & Conditions</span>, auto-renewal policy, and
                  platform commission on package sales.
                </span>
              </label>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Footer actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={goBack}
          disabled={submitting || tokenizing || verifying}
          className="glass flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 1 ? "Plans" : "Back"}
        </button>
        {step < 4 ? (
          <button
            onClick={goNext}
            disabled={submitting || tokenizing || verifying}
            className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {tokenizing || verifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !agreedFinal}
            className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Confirm & Activate
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
