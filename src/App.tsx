import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { BrandProvider } from "@/hooks/useBrandContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { MockupModeProvider } from "@/hooks/useMockupMode";
import { MainLayout } from "@/components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Creative from "./pages/Creative";
import Personnel from "./pages/Personnel";
import Approvals from "./pages/Approvals";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Payments from "./pages/Payments";
import Balances from "./pages/Balances";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Integrations from "./pages/Integrations";
import Reports from "./pages/Reports";
import Connect from "./pages/Connect";
import StoreSettings from "./pages/StoreSettings";
import UserSettings from "./pages/UserSettings";
import Stck from "./pages/Stck";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <BrandProvider>
              <MockupModeProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
                  <Route path="/payments" element={<MainLayout><Payments /></MainLayout>} />
                  <Route path="/balances" element={<MainLayout><Balances /></MainLayout>} />
                  <Route path="/customers" element={<MainLayout><Customers /></MainLayout>} />
                  <Route path="/products" element={<MainLayout><Products /></MainLayout>} />
                  
                  <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
                  <Route path="/connect" element={<MainLayout><Connect /></MainLayout>} />
                  <Route path="/accounts" element={<MainLayout><Accounts /></MainLayout>} />
                  <Route path="/creative" element={<Creative />} />
                  <Route path="/integrations" element={<MainLayout><Integrations /></MainLayout>} />
                  <Route path="/personnel" element={<MainLayout><Personnel /></MainLayout>} />
                  <Route path="/approvals" element={<MainLayout><Approvals /></MainLayout>} />
                  <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
                  <Route path="/store-settings" element={<MainLayout><StoreSettings /></MainLayout>} />
                  <Route path="/user-settings" element={<MainLayout><UserSettings /></MainLayout>} />
                  <Route path="/stck" element={<Stck />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </TooltipProvider>
              </MockupModeProvider>
            </BrandProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </NextThemeProvider>
  </QueryClientProvider>
);

export default App;
