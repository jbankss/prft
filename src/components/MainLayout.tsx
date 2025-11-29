import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandContext } from '@/hooks/useBrandContext';
import { TopNav } from '@/components/TopNav';
import { PendingApproval } from './PendingApproval';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { availableBrands, loading: brandsLoading } = useBrandContext();

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
      <main className="p-6 max-w-[1600px] mx-auto">
        {children}
      </main>
    </div>
  );
}
