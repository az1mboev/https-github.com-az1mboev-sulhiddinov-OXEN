import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";

/**
 * RequireConsultingMember — wraps protected consulting routes.
 *
 * Multi-agency flow:
 *   - Guests → /auth (with redirect back)
 *   - Zero agencies (no memberships at all) → /consulting/workspace
 *   - Has agencies but no active subscription → /consulting/plans or /consulting/expired
 *
 * Routes that must remain accessible when the subscription is EXPIRED
 * (renew, billing, support, security) should set `allowExpired`.
 *
 * The workspace onboarding route itself is wrapped with `allowOnboarding`
 * so it renders even when the user has zero agencies.
 */
interface Props {
  children: React.ReactNode;
  /** When true, allows access even with an expired subscription (renew/billing/support routes). */
  allowExpired?: boolean;
  /** When true, renders even if the user has zero agencies (workspace/create/join routes). */
  allowOnboarding?: boolean;
}

function Inner({ children, allowExpired = false, allowOnboarding = false }: Props) {
  const { user, ready: authReady } = useAuth();
  const { isMember, loading, subscriptionAccess, hasNoAgencies } = useConsulting();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.isGuest) {
      navigate("/auth?redirect=" + encodeURIComponent(location.pathname), { replace: true });
      return;
    }
    if (loading) return;

    // Zero agencies → redirect to workspace onboarding (unless this IS the workspace route)
    if (hasNoAgencies && !allowOnboarding) {
      navigate("/consulting/workspace", { replace: true });
      return;
    }

    if (!isMember && !allowOnboarding) {
      navigate("/consulting/workspace", { replace: true });
      return;
    }
    if (!allowExpired && subscriptionAccess === "expired") {
      navigate("/consulting/expired", { replace: true });
    }
    if (!allowExpired && subscriptionAccess === "none") {
      navigate("/consulting/plans", { replace: true });
    }
  }, [authReady, user, isMember, loading, subscriptionAccess, allowExpired, allowOnboarding, hasNoAgencies, navigate, location.pathname]);

  if (!authReady || loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.isGuest) {
    return null;
  }

  // Onboarding routes are accessible even with zero agencies
  if (allowOnboarding) {
    return <>{children}</>;
  }

  if (!isMember) {
    return null;
  }

  // Block operational pages for expired/none unless explicitly allowed.
  if (!allowExpired && (subscriptionAccess === "expired" || subscriptionAccess === "none")) {
    return null;
  }

  return <>{children}</>;
}

export default function RequireConsultingMember({ children, allowExpired, allowOnboarding }: Props) {
  return (
    <Inner allowExpired={allowExpired} allowOnboarding={allowOnboarding}>
      {children}
    </Inner>
  );
}
