import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function MainLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    console.log('MainLayout: user', user?.email, 'loading', loading);
    if (!loading && !user) {
      console.log('MainLayout: Redirecting to /auth');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  console.log('MainLayout: Rendering. Loading:', loading, 'User:', user?.email);

  if (loading) {
    console.log('MainLayout: Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    console.log('MainLayout: No user, returning null (should redirect)');
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border glass flex items-center justify-between px-4 shadow-apple-sm">
            <SidebarTrigger className="transition-all duration-200 hover:scale-110" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="transition-all duration-200 hover:scale-110"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="transition-all duration-200 hover:scale-110"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}