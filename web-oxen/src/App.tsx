import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Layout from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { CommentsProvider } from "./contexts/CommentsContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { OfflineProvider } from "./contexts/OfflineContext";
import { ReportProvider } from "./contexts/ReportContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { SupportProvider } from "./contexts/SupportContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TravelProvider } from "./contexts/TravelContext";

/* ------------------------------------------------------------------ */
/*  Code-splitting: each route becomes its own lazy bundle so the      */
/*  initial download only contains the shell + providers. The Globe    */
/*  route pulls three.js only when visited.                            */
/* ------------------------------------------------------------------ */

const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));
const City = lazy(() => import("./pages/City"));
const ConsultingDashboard = lazy(() => import("./pages/ConsultingDashboard"));
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
            <ChatProvider>
              <ReportProvider>
                <CommentsProvider>
                  <OfflineProvider>
                    <SupportProvider>
                      <SidebarProvider>
                        <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        <BrowserRouter
                          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
                        >
                          <Suspense fallback={<RouteFallback />}>
                            <Routes>
                              <Route path="/auth" element={<Auth />} />
                              <Route element={<Layout />}>
                                <Route path="/" element={<Index />} />
                                <Route path="/country/:countryId" element={<Country />} />
                                <Route
                                  path="/country/:countryId/city/:cityId"
                                  element={<City />}
                                />
                                <Route path="/explore" element={<Explore />} />
                                <Route path="/travel" element={<Travel />} />
                                <Route path="/trips" element={<Trips />} />
                                <Route path="/planner" element={<Planner />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/services" element={<Services />} />
                                <Route path="/services/:serviceId" element={<ServiceDetails />} />
                                <Route
                                  path="/dashboard/consulting"
                                  element={<ConsultingDashboard />}
                                />
                                <Route
                                  path="/dashboard/services/new"
                                  element={<ServiceEditor />}
                                />
                                <Route
                                  path="/dashboard/services/edit/:serviceId"
                                  element={<ServiceEditor />}
                                />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/profile/edit" element={<EditProfile />} />
                                <Route path="/support" element={<Support />} />
                                <Route path="/messages" element={<Messages />} />
                                <Route path="/admin" element={<Admin />} />
                              </Route>
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </BrowserRouter>
                      </TooltipProvider>
                    </SidebarProvider>
                    </SupportProvider>
                  </OfflineProvider>
                </CommentsProvider>
              </ReportProvider>
            </ChatProvider>
          </TravelProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
