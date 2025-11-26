import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { BrandProvider } from "@/hooks/useBrandContext";
import { MainLayout } from "@/components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Creative from "./pages/Creative";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <BrandProvider>
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
                <Route path="/creative" element={<MainLayout><Creative /></MainLayout>} />
                <Route path="/integrations" element={<MainLayout><Integrations /></MainLayout>} />
                <Route path="/approvals" element={<MainLayout><Approvals /></MainLayout>} />
                <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrandProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
