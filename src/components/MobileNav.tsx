import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Clock, Store, Home, Users, Palette, Link2, CreditCard, UserCog, ShoppingBag } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BrandSwitcher } from './BrandSwitcher';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useBrandContext } from '@/hooks/useBrandContext';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Accounts', path: '/accounts', icon: Users },
  { label: 'Creative', path: '/creative', icon: Palette },
  { label: 'Integrations', path: '/integrations', icon: Link2 },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Personnel', path: '/personnel', icon: UserCog },
  { label: 'Customers', path: '/customers', icon: ShoppingBag },
];

export function MobileNav() {
  const location = useLocation();
  const { currentBrand } = useBrandContext();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-10 w-10">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {currentBrand?.logo_url ? (
              <img
                src={currentBrand.logo_url}
                alt={currentBrand.name}
                className="h-8 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="text-lg font-display font-semibold">
                {currentBrand?.name || 'Menu'}
              </span>
            )}
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-auto py-4">
          <div className="space-y-1 px-2">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <SheetClose asChild key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </SheetClose>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Quick Actions */}
          <div className="space-y-1 px-2">
            <SheetClose asChild>
              <Link
                to="/stck"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Clock className="h-5 w-5" />
                stck
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                to="/store-settings"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Store className="h-5 w-5" />
                Store Settings
              </Link>
            </SheetClose>
          </div>
        </nav>

        {/* Footer - Brand Switcher & User */}
        <div className="border-t border-border p-4 space-y-3">
          <BrandSwitcher />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Account</span>
            <UserProfileDropdown />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
