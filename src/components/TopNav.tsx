import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Zap, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandSwitcher } from './BrandSwitcher';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useBrandContext } from '@/hooks/useBrandContext';
const navItems = [{
  label: 'Home',
  path: '/'
}, {
  label: 'Accounts',
  path: '/accounts'
}, {
  label: 'Creative',
  path: '/creative'
}, {
  label: 'Integrations',
  path: '/integrations'
}, {
  label: 'Payments',
  path: '/payments'
}, {
  label: 'Personnel',
  path: '/personnel'
}, {
  label: 'Customers',
  path: '/customers'
}];
export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentBrand
  } = useBrandContext();
  return <header className="border-b border-border/50 bg-background">
      <div className="flex items-center h-20 px-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-12">
          {currentBrand?.logo_url ? <img src={currentBrand.logo_url} alt={currentBrand.name} className="h-12 w-auto max-w-[200px] object-contain" /> : <>
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
                <Zap className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-3xl font-display font-semibold text-foreground tracking-tight">
                {currentBrand?.name || 'MJ Fashion'}
              </span>
            </>}
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return <Link key={item.path} to={item.path} className={`relative px-4 py-2 text-base font-medium rounded-full transition-all ${isActive ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                {item.label}
              </Link>;
        })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/store-settings')} className="gap-2 rounded-full">
            <Store className="h-4 w-4" />
          </Button>
          <BrandSwitcher />
          <UserProfileDropdown />
        </div>
      </div>
    </header>;
}