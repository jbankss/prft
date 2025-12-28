import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Clock, Store, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandSwitcher } from './BrandSwitcher';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useBrandContext } from '@/hooks/useBrandContext';

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Accounts', path: '/accounts' },
  { label: 'Creative', path: '/creative' },
  { label: 'Integrations', path: '/integrations' },
  { label: 'Payments', path: '/payments' },
  { label: 'Personnel', path: '/personnel' },
  { label: 'Customers', path: '/customers' }
];

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentBrand } = useBrandContext();

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center h-16 px-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-10">
          {currentBrand?.logo_url ? (
            <img
              src={currentBrand.logo_url}
              alt={currentBrand.name}
              className="h-10 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-semibold text-foreground tracking-tight">
                {currentBrand?.name || 'MJ Fashion'}
              </span>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5 flex-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-4 py-2 text-sm font-medium transition-colors duration-200 group ${
                  isActive 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
                {/* Elegant underline indicator */}
                <span 
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-foreground rounded-full transition-all duration-300 ease-out ${
                    isActive 
                      ? 'w-4 opacity-100' 
                      : 'w-0 opacity-0 group-hover:w-3 group-hover:opacity-40'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/stck')}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/store-settings')}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Store className="h-4 w-4" />
          </Button>
          <BrandSwitcher />
          <UserProfileDropdown />
        </div>
      </div>
    </header>
  );
}
