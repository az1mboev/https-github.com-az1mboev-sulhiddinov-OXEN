import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { ConsultingProvider, useConsulting } from "@/contexts/ConsultingContext";

/**
 * RequireConsultingMember — wraps protected consulting routes.
 * Redirects guests → /auth, non-members → /explore.
 * Provides ConsultingContext to children.
 */
function Inner({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const { isMember, loading } = useConsulting();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.isGuest) {
      navigate("/auth?redirect=" + encodeURIComponent(window.location.pathname), { replace: true });
      return;
    }
    if (!loading && !isMember) {
      navigate("/explore", { replace: true });
    }
  }, [authReady, user, isMember, loading, navigate]);

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

  return <>{children}</>;
}

export default function RequireConsultingMember({ children }: { children: React.ReactNode }) {
  return (
    <ConsultingProvider>
      <Inner>{children}</Inner>
    </ConsultingProvider>
  );
}
