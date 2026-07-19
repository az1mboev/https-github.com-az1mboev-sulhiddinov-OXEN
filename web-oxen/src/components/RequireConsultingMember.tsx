import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";

/**
 * RequireConsultingMember — wraps protected consulting routes.
 *
 * Redirects:
 *   - Guests → /auth (with redirect back)
 *   - Non-members (no company at all) → /explore
 *   - Expired subscriptions → /consulting/expired
 *
 * Routes that must remain accessible when the subscription is EXPIRED
 * (renew, billing, support, security) should set `allowExpired`.
 *
 * Relies on the single top-level ConsultingProvider in App.tsx.
 */
interface Props {
  children: React.ReactNode;
  /** When true, allows access even with an expired subscription (renew/billing/support routes). */
  allowExpired?: boolean;
}

function Inner({ children, allowExpired = false }: Props) {
  const { user, ready: authReady } = useAuth();
  const { isMember, loading, subscriptionAccess } = useConsulting();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.isGuest) {
      navigate("/auth?redirect=" + encodeURIComponent(location.pathname), { replace: true });
      return;
    }
    if (loading) return;
    if (!isMember) {
      navigate("/explore", { replace: true });
      return;
    }
    if (!allowExpired && subscriptionAccess === "expired") {
      navigate("/consulting/expired", { replace: true });
    }
    if (!allowExpired && subscriptionAccess === "none") {
      navigate("/consulting/plans", { replace: true });
    }
  }, [authReady, user, isMember, loading, subscriptionAccess, allowExpired, navigate, location.pathname]);

  if (!authReady || loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.isGuest || !isMember) {
    return null;
  }

  // Block operational pages for expired/none unless explicitly allowed.
  if (!allowExpired && (subscriptionAccess === "expired" || subscriptionAccess === "none")) {
    return null;
  }

  return <>{children}</>;
}

export default function RequireConsultingMember({ children, allowExpired }: Props) {
  return <Inner allowExpired={allowExpired}>{children}</Inner>;
}
