import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandContext } from '@/hooks/useBrandContext';
import { TopNav } from '@/components/TopNav';
import { PendingApproval } from './PendingApproval';
import { FloatingAssistant } from '@/components/global/FloatingAssistant';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { availableBrands, loading: brandsLoading } = useBrandContext();
  const location = useLocation();
  const [isPageReady, setIsPageReady] = useState(false);

  // Trigger page enter animation on route change
  useEffect(() => {
    setIsPageReady(false);
    const timer = setTimeout(() => setIsPageReady(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (authLoading || brandsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (availableBrands.length === 0) {
    return <PendingApproval />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main 
        className={cn(
          "p-4 md:p-6 transition-all duration-500 ease-elegant",
          isPageReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
      >
        {children}
      </main>
      <FloatingAssistant />
    </div>
  );
}
