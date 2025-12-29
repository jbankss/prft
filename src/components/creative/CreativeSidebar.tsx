import { Home, Image, Upload, BarChart3, HardDrive, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CreativeSidebarProps {
  activeView: 'overview' | 'assets' | 'upload' | 'analytics' | 'storage' | 'approvals';
  onViewChange: (view: CreativeSidebarProps['activeView']) => void;
  pendingApprovals?: number;
}

export function CreativeSidebar({ activeView, onViewChange, pendingApprovals = 0 }: CreativeSidebarProps) {
  const menuItems = [
    { id: 'overview' as const, icon: Home, label: 'Home' },
    { id: 'assets' as const, icon: Image, label: 'Assets' },
    { id: 'upload' as const, icon: Upload, label: 'Upload' },
    { id: 'approvals' as const, icon: ClipboardCheck, label: 'Approvals', badge: pendingApprovals },
    { id: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
    { id: 'storage' as const, icon: HardDrive, label: 'Storage' },
  ];

  return (
    <aside className="w-20 bg-card border-r border-border flex flex-col items-center py-6 gap-2">
      {/* Logo */}
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 shadow-lg">
        <span className="text-primary-foreground font-bold text-lg">fldr</span>
      </div>

      <div className="flex flex-col gap-1 w-full items-center">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-14 h-14 rounded-2xl transition-all flex flex-col gap-1 relative",
                isActive 
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' 
                  : 'hover:bg-muted'
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </aside>
  );
}
