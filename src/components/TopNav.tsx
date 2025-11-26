import { Link, useLocation } from 'react-router-dom';
import { Calendar, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandSwitcher } from './BrandSwitcher';
import { useBrandContext } from '@/hooks/useBrandContext';

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Payments', path: '/payments' },
  { label: 'Balances', path: '/balances' },
  { label: 'Customers', path: '/customers' },
  { label: 'Products', path: '/products' },
  { label: 'Billing', path: '/billing' },
  { label: 'Reports', path: '/reports' },
  { label: 'Connect', path: '/connect' },
];

export function TopNav() {
  const location = useLocation();
  const { currentBrand } = useBrandContext();

  return (
    <header className="border-b bg-card">
      <div className="flex items-center h-16 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-foreground">
            {currentBrand?.name || 'MJ Fashion'}
          </span>
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
        <div className="flex items-center gap-4">
          <BrandSwitcher />
        </div>
      </div>
    </header>
  );
}
