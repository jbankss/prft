import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Building2, Activity, DollarSign, CreditCard, Calendar, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountsSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function AccountsSidebar({ activeView, onViewChange }: AccountsSidebarProps) {
  const { currentBrand } = useBrandContext();

  if (!currentBrand) {
    return (
      <div className="w-80 border-r border-border/40 bg-background/50 backdrop-blur-sm p-6">
        <p className="text-muted-foreground">Select a brand to view headquarters</p>
      </div>
    );
  }

  const views = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'snapshot', label: 'Snapshot', icon: Sparkles },
    { id: 'activity', label: 'Activity Timeline', icon: Activity },
    { id: 'balances', label: 'Balances', icon: DollarSign },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'calendar', label: 'Calendar View', icon: Calendar },
  ];

  return (
    <div className="w-80 border-r border-border/40 bg-background/50 backdrop-blur-sm p-6 space-y-6">
      <Card className="animated-gradient border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {currentBrand.logo_url ? (
              <img 
                src={currentBrand.logo_url} 
                alt={currentBrand.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{currentBrand.name}</CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {currentBrand.website || 'No website'}
              </p>
            </div>
          </div>
        </CardHeader>
        {currentBrand.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {currentBrand.description}
            </p>
          </CardContent>
        )}
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Views
        </h3>
        <div className="space-y-1">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <Button
                key={view.id}
                variant={activeView === view.id ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  activeView === view.id && 'bg-primary/10 text-primary hover:bg-primary/20'
                )}
                onClick={() => onViewChange(view.id)}
              >
                <Icon className="h-4 w-4" />
                {view.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Stats
        </h3>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contact</span>
            <span className="font-medium truncate ml-2">{currentBrand.contact_email || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">{currentBrand.contact_phone || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
