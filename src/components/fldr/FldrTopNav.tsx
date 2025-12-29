import { useState } from 'react';
import { Home, Image, Upload, BarChart3, HardDrive, ClipboardCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type ViewType = 'overview' | 'assets' | 'upload' | 'analytics' | 'storage' | 'approvals';

interface FldrTopNavProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  pendingApprovals: number;
}

const navItems = [
  { id: 'overview' as ViewType, label: 'Home', icon: Home },
  { id: 'assets' as ViewType, label: 'Assets', icon: Image },
  { id: 'upload' as ViewType, label: 'Upload', icon: Upload },
  { id: 'approvals' as ViewType, label: 'Approvals', icon: ClipboardCheck },
  { id: 'analytics' as ViewType, label: 'Analytics', icon: BarChart3 },
  { id: 'storage' as ViewType, label: 'Storage', icon: HardDrive },
];

export function FldrTopNav({ activeView, onViewChange, pendingApprovals }: FldrTopNavProps) {
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<ViewType | null>(null);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Back to Dashboard */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-all duration-300 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        {/* Center Navigation */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-2xl p-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const isHovered = hoveredItem === item.id;
            const showBadge = item.id === 'approvals' && pendingApprovals > 0;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  isHovered && !isActive && "bg-muted/50"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  (isActive || isHovered) && "scale-110"
                )} />
                <span className="hidden md:inline">{item.label}</span>
                
                {/* Badge for approvals */}
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1 animate-pulse">
                    {pendingApprovals > 99 ? '99+' : pendingApprovals}
                  </span>
                )}

                {/* Active indicator line */}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Logo / Brand */}
        <div className="text-xl font-display font-bold tracking-tight text-primary">
          fldr
        </div>
      </div>
    </nav>
  );
}
