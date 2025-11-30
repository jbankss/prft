import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Zap, Store, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandSwitcher } from './BrandSwitcher';
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
  label: 'Approvals',
  path: '/approvals'
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
  return <header className="border-b bg-card">
      <div className="flex items-center h-16 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-8">
          {currentBrand?.logo_url ? <img src={currentBrand.logo_url} alt={currentBrand.name} className="h-8 w-auto max-w-[200px] object-contain" /> : <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-foreground">
                {currentBrand?.name || 'MJ Fashion'}
              </span>
            </>}
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-6 flex-1">
          {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return <Link key={item.path} to={item.path} className={`relative pb-1 text-sm font-medium transition-colors ${isActive ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {item.label}
              </Link>;
        })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/store-settings')} className="gap-2">
            <Store className="h-4 w-4" />
            
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/user-settings')} className="gap-2">
            <User className="h-4 w-4" />
            
          </Button>
          <BrandSwitcher />
        </div>
      </div>
    </header>;
}