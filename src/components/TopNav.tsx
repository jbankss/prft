import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Zap, Store, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandSwitcher } from './BrandSwitcher';
import { StoreSettingsDialog } from './StoreSettingsDialog';
import { UserSettingsDialog } from './UserSettingsDialog';
import { useBrandContext } from '@/hooks/useBrandContext';

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Accounts', path: '/accounts' },
  { label: 'Creative', path: '/creative' },
  { label: 'Payments', path: '/payments' },
  { label: 'Approvals', path: '/approvals' },
  { label: 'Customers', path: '/customers' },
];

export function TopNav() {
  const location = useLocation();
  const { currentBrand } = useBrandContext();
  const [storeSettingsOpen, setStoreSettingsOpen] = useState(false);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);

  return (
    <header className="border-b bg-card">
      <div className="flex items-center h-16 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-8">
          {currentBrand?.logo_url ? (
            <img 
              src={currentBrand.logo_url} 
              alt={currentBrand.name}
              className="h-8 w-auto max-w-[200px] object-contain"
            />
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-foreground">
                {currentBrand?.name || 'MJ Fashion'}
              </span>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStoreSettingsOpen(true)}
            className="gap-2"
          >
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Store Settings</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUserSettingsOpen(true)}
            className="gap-2"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">User Settings</span>
          </Button>
          <BrandSwitcher />
        </div>
      </div>

      <StoreSettingsDialog 
        open={storeSettingsOpen} 
        onOpenChange={setStoreSettingsOpen}
      />
      <UserSettingsDialog 
        open={userSettingsOpen} 
        onOpenChange={setUserSettingsOpen}
      />
    </header>
  );
}
