import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import RequireConsultingMember from "./components/RequireConsultingMember";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { CommentsProvider } from "./contexts/CommentsContext";
import { ConsultingProvider } from "./contexts/ConsultingContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { OfflineProvider } from "./contexts/OfflineContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { ReportProvider } from "./contexts/ReportContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { SupportProvider } from "./contexts/SupportContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TravelProvider } from "./contexts/TravelContext";
import { UniversityProvider } from "./contexts/UniversityContext";

/* ------------------------------------------------------------------ */
/*  Code-splitting: each route becomes its own lazy bundle so the      */
/*  initial download only contains the shell + providers. The Globe    */
/*  route pulls three.js only when visited.                            */
/* ------------------------------------------------------------------ */

const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));
const Checkout = lazy(() => import("./pages/Checkout"));
const City = lazy(() => import("./pages/City"));
const ConsultingDashboard = lazy(() => import("./pages/ConsultingDashboard"));
const ConsultingSetupSuccess = lazy(() => import("./pages/consulting/SetupSuccess"));
const ConsultingPlans = lazy(() => import("./pages/consulting/Plans"));
const ConsultingSubscriptionExpired = lazy(() => import("./pages/consulting/SubscriptionExpired"));
const ConsultingRenew = lazy(() => import("./pages/consulting/Renew"));
const ConsultingBilling = lazy(() => import("./pages/consulting/Billing"));
const ConsultingDashboardHome = lazy(() => import("./pages/consulting/DashboardHome"));
const ConsultingCompanyProfile = lazy(() => import("./pages/consulting/CompanyProfile"));
const ConsultingPublicCompanyProfile = lazy(() => import("./pages/consulting/PublicCompanyProfile"));
const ConsultingClients = lazy(() => import("./pages/consulting/Clients"));
const ConsultingApplications = lazy(() => import("./pages/consulting/Applications"));
const ConsultingPackages = lazy(() => import("./pages/consulting/Packages"));
const ConsultingPublicPackage = lazy(() => import("./pages/consulting/PublicPackageProfile"));
const ConsultingEmployees = lazy(() => import("./pages/consulting/Employees"));
const ConsultingAnalytics = lazy(() => import("./pages/consulting/Analytics"));
const ConsultingActivityLog = lazy(() => import("./pages/consulting/ActivityLog"));
const ConsultingPostsComingSoon = lazy(() =>
  import("./pages/consulting/ComingSoonPages").then((m) => ({ default: m.PostsComingSoon })),
);
const ConsultingPaymentsComingSoon = lazy(() =>
  import("./pages/consulting/ComingSoonPages").then((m) => ({ default: m.PaymentsComingSoon })),
);
const ConsultingReviewsComingSoon = lazy(() =>
  import("./pages/consulting/ComingSoonPages").then((m) => ({ default: m.ReviewsComingSoon })),
);
const ConsultingSubscriptionComingSoon = lazy(() =>
  import("./pages/consulting/ComingSoonPages").then((m) => ({ default: m.SubscriptionComingSoon })),
);
const ConsultingSettingsComingSoon = lazy(() =>
  import("./pages/consulting/ComingSoonPages").then((m) => ({ default: m.SettingsComingSoon })),
);
const ConsultingSupportComingSoon = lazy(() =>
  import("./pages/consulting/ComingSoonPages").then((m) => ({ default: m.SupportComingSoon })),
);
const Country = lazy(() => import("./pages/Country"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Explore = lazy(() => import("./pages/Explore"));
const Index = lazy(() => import("./pages/Index"));
const Messages = lazy(() => import("./pages/Messages"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Planner = lazy(() => import("./pages/Planner"));
const Profile = lazy(() => import("./pages/Profile"));
const ServiceDetails = lazy(() => import("./pages/ServiceDetails"));
const ServiceEditor = lazy(() => import("./pages/ServiceEditor"));
const Services = lazy(() => import("./pages/Services"));
const Support = lazy(() => import("./pages/Support"));
const Travel = lazy(() => import("./pages/Travel"));
const Trips = lazy(() => import("./pages/Trips"));
const Universities = lazy(() => import("./pages/Universities"));
const UniversityDetail = lazy(() => import("./pages/UniversityDetail"));

// Settings sub-pages (code-split)
const SettingsAbout = lazy(() => import("./pages/settings/About"));
const SettingsActiveDevices = lazy(() => import("./pages/settings/ActiveDevices"));
const SettingsBiometrics = lazy(() => import("./pages/settings/Biometrics"));
const SettingsBlockedUsers = lazy(() => import("./pages/settings/BlockedUsers"));
const SettingsChangePassword = lazy(() => import("./pages/settings/ChangePassword"));
const SettingsClearCache = lazy(() => import("./pages/settings/ClearCache"));
const SettingsConnection = lazy(() => import("./pages/settings/ConnectionStatus"));
const SettingsCurrency = lazy(() => import("./pages/settings/CurrencySettings"));
const SettingsDistanceUnit = lazy(() => import("./pages/settings/DistanceUnitSettings"));
const SettingsDownloadData = lazy(() => import("./pages/settings/DownloadMyData"));
const SettingsExportHistory = lazy(() => import("./pages/settings/ExportTravelHistory"));
const SettingsLanguage = lazy(() => import("./pages/settings/LanguageSettings"));
const SettingsLoginActivity = lazy(() => import("./pages/settings/LoginActivity"));
const SettingsTimeZone = lazy(() => import("./pages/settings/TimeZoneSettings"));
const SettingsTwoFactor = lazy(() => import("./pages/settings/TwoFactorAuth"));

/* ------------------------------------------------------------------ */
/*  QueryClient — production-grade defaults: longer stale time, retry  */
/*  with exponential backoff, refetch on reconnect.                    */
/* ------------------------------------------------------------------ */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min — avoids redundant refetches
      gcTime: 5 * 60_000, // 5 min garbage collection
      retry: (failureCount, error: unknown) => {
        // Don't retry on auth errors (4xx) — they won't succeed
        const status =
          (error as { status?: number; code?: number })?.status ??
          (error as { statusCode?: number })?.statusCode;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
    },
    mutations: {
      retry: 1,
    },
  },
});

/** Full-screen skeleton shown while a lazy route chunk loads. */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-live="polite">
      <div className="oxen-skeleton-globe" aria-label="Loading" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TravelProvider>
            <UniversityProvider>
              <ChatProvider>
                <ReportProvider>
                  <CommentsProvider>
                    <OfflineProvider>
                      <PreferencesProvider>
                        <SupportProvider>
                          <SidebarProvider>
                            <TooltipProvider>
                          <Toaster />
                          <Sonner />
                          <BrowserRouter
                            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
                          >
                            <ConsultingProvider>
                            <Suspense fallback={<RouteFallback />}>
                              <Routes>
                              <Route path="/auth" element={<Auth />} />
                              <Route path="/consulting/plans" element={<ConsultingPlans />} />
                              <Route path="/consulting/checkout" element={<Checkout />} />
                              <Route path="/consulting/setup-success" element={<ConsultingSetupSuccess />} />
                              {/* Subscription-expired screen — only consulting members with expired subs can see this */}
                              <Route
                                path="/consulting/expired"
                                element={
                                  <RequireAuth>
                                    <RequireConsultingMember allowExpired>
                                      <ConsultingSubscriptionExpired />
                                    </RequireConsultingMember>
                                  </RequireAuth>
                                }
                              />
                              {/* Renew — accessible when expired */}
                              <Route
                                path="/consulting/renew"
                                element={
                                  <RequireAuth>
                                    <RequireConsultingMember allowExpired>
                                      <ConsultingRenew />
                                    </RequireConsultingMember>
                                  </RequireAuth>
                                }
                              />
                              {/* Billing — accessible both when active and when expired */}
                              <Route
                                path="/consulting/billing"
                                element={
                                  <RequireAuth>
                                    <RequireConsultingMember allowExpired>
                                      <ConsultingBilling />
                                    </RequireConsultingMember>
                                  </RequireAuth>
                                }
                              />
                              {/* Public company profile — visible only when published */}
                              <Route path="/consulting/company/:companyId" element={<ConsultingPublicCompanyProfile />} />
                              <Route element={<Layout />}>
                                <Route path="/" element={<Index />} />
                                <Route path="/country/:countryId" element={<Country />} />
                                <Route
                                  path="/country/:countryId/city/:cityId"
                                  element={<City />}
                                />
                                <Route path="/explore" element={<Explore />} />
                                <Route path="/travel" element={<Travel />} />
                                <Route path="/universities" element={<Universities />} />
                                <Route path="/universities/:universityId" element={<UniversityDetail />} />
                                <Route path="/trips" element={<Trips />} />
                                <Route path="/planner" element={<Planner />} />
                                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                                <Route path="/services" element={<Services />} />
                                <Route path="/services/:serviceId" element={<ServiceDetails />} />
                                <Route
                                  path="/dashboard/consulting"
                                  element={<RequireAuth><ConsultingDashboard /></RequireAuth>}
                                />
                                <Route
                                  path="/consulting/dashboard"
                                  element={
                                    <RequireAuth>
                                      <RequireConsultingMember>
                                        <ConsultingDashboardHome />
                                      </RequireConsultingMember>
                                    </RequireAuth>
                                  }
                                />
                                {/* Consulting dashboard sections — all navigable; unfinished ones show a polished "next phase" page */}
                                <Route path="/consulting/clients" element={<RequireAuth><RequireConsultingMember><ConsultingClients /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/applications" element={<RequireAuth><RequireConsultingMember><ConsultingApplications /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/packages" element={<RequireAuth><RequireConsultingMember><ConsultingPackages /></RequireConsultingMember></RequireAuth>} />
                                {/* Public package route — visible only when published */}
                                <Route path="/consulting/package/:packageId" element={<ConsultingPublicPackage />} />
                                <Route path="/consulting/employees" element={<RequireAuth><RequireConsultingMember><ConsultingEmployees /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/posts" element={<RequireAuth><RequireConsultingMember><ConsultingPostsComingSoon /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/payments" element={<RequireAuth><RequireConsultingMember><ConsultingPaymentsComingSoon /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/analytics" element={<RequireAuth><RequireConsultingMember><ConsultingAnalytics /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/activity" element={<RequireAuth><RequireConsultingMember><ConsultingActivityLog /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/reviews" element={<RequireAuth><RequireConsultingMember><ConsultingReviewsComingSoon /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/company-profile" element={<RequireAuth><RequireConsultingMember><ConsultingCompanyProfile /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/subscription" element={<RequireAuth><RequireConsultingMember allowExpired><ConsultingSubscriptionComingSoon /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/settings" element={<RequireAuth><RequireConsultingMember><ConsultingSettingsComingSoon /></RequireConsultingMember></RequireAuth>} />
                                <Route path="/consulting/support" element={<RequireAuth><RequireConsultingMember allowExpired><ConsultingSupportComingSoon /></RequireConsultingMember></RequireAuth>} />
                                <Route
                                  path="/dashboard/services/new"
                                  element={<RequireAuth><ServiceEditor /></RequireAuth>}
                                />
                                <Route
                                  path="/dashboard/services/edit/:serviceId"
                                  element={<RequireAuth><ServiceEditor /></RequireAuth>}
                                />

                                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                                <Route path="/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
                                <Route path="/support" element={<Support />} />
                                <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
                                <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />

                                {/* Settings sub-pages */}
                                <Route path="/settings/change-password" element={<RequireAuth><SettingsChangePassword /></RequireAuth>} />
                                <Route path="/settings/two-factor" element={<RequireAuth><SettingsTwoFactor /></RequireAuth>} />
                                <Route path="/settings/active-devices" element={<RequireAuth><SettingsActiveDevices /></RequireAuth>} />
                                <Route path="/settings/login-activity" element={<RequireAuth><SettingsLoginActivity /></RequireAuth>} />
                                <Route path="/settings/biometrics" element={<RequireAuth><SettingsBiometrics /></RequireAuth>} />
                                <Route path="/settings/currency" element={<RequireAuth><SettingsCurrency /></RequireAuth>} />
                                <Route path="/settings/timezone" element={<RequireAuth><SettingsTimeZone /></RequireAuth>} />
                                <Route path="/settings/distance-unit" element={<RequireAuth><SettingsDistanceUnit /></RequireAuth>} />
                                <Route path="/settings/language" element={<RequireAuth><SettingsLanguage /></RequireAuth>} />
                                <Route path="/settings/connection" element={<RequireAuth><SettingsConnection /></RequireAuth>} />
                                <Route path="/settings/clear-cache" element={<RequireAuth><SettingsClearCache /></RequireAuth>} />
                                <Route path="/settings/download-data" element={<RequireAuth><SettingsDownloadData /></RequireAuth>} />
                                <Route path="/settings/export-history" element={<RequireAuth><SettingsExportHistory /></RequireAuth>} />
                                <Route path="/settings/blocked-users" element={<RequireAuth><SettingsBlockedUsers /></RequireAuth>} />
                                <Route path="/settings/about" element={<RequireAuth><SettingsAbout /></RequireAuth>} />
                              </Route>
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                            </ConsultingProvider>
                        </BrowserRouter>
                          </TooltipProvider>
                        </SidebarProvider>
                      </SupportProvider>
                    </PreferencesProvider>
                  </OfflineProvider>
                </CommentsProvider>
              </ReportProvider>
            </ChatProvider>
            </UniversityProvider>
          </TravelProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
