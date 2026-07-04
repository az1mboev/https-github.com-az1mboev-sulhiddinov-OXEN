import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { ThemeProvider } from "./contexts/ThemeContext";
import { TravelProvider } from "./contexts/TravelContext";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import City from "./pages/City";
import Country from "./pages/Country";
import Dashboard from "./pages/Dashboard";
import EditProfile from "./pages/EditProfile";
import Explore from "./pages/Explore";
import Index from "./pages/Index";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Planner from "./pages/Planner";
import Profile from "./pages/Profile";
import Travel from "./pages/Travel";
import Trips from "./pages/Trips";

const queryClient = new QueryClient();

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
                    <SidebarProvider>
                    <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                      <Routes>
                        <Route path="/auth" element={<Auth />} />
                        <Route element={<Layout />}>
                          <Route path="/" element={<Index />} />
                          <Route path="/country/:countryId" element={<Country />} />
                          <Route path="/country/:countryId/city/:cityId" element={<City />} />
                          <Route path="/explore" element={<Explore />} />
                          <Route path="/travel" element={<Travel />} />
                          <Route path="/trips" element={<Trips />} />
                          <Route path="/planner" element={<Planner />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/profile/edit" element={<EditProfile />} />
                          <Route path="/messages" element={<Messages />} />
                          <Route path="/admin" element={<Admin />} />
                        </Route>
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </BrowserRouter>
                    </TooltipProvider>
                    </SidebarProvider>
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
