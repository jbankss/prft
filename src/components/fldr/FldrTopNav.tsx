import { useState } from 'react';
import { Home, Image, Upload, BarChart3, HardDrive, ClipboardCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import fldrLogo from '@/assets/fldr-logo.png';

type ViewType = 'overview' | 'assets' | 'upload' | 'analytics' | 'storage' | 'approvals';

interface FldrTopNavProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  pendingApprovals: number;
  onExit?: () => void;
}

const navItems = [
  { id: 'overview' as ViewType, label: 'Home', icon: Home },
  { id: 'assets' as ViewType, label: 'Assets', icon: Image },
  { id: 'upload' as ViewType, label: 'Upload', icon: Upload },
  { id: 'approvals' as ViewType, label: 'Approvals', icon: ClipboardCheck },
  { id: 'analytics' as ViewType, label: 'Analytics', icon: BarChart3 },
  { id: 'storage' as ViewType, label: 'Storage', icon: HardDrive },
];

export function FldrTopNav({ activeView, onViewChange, pendingApprovals, onExit }: FldrTopNavProps) {
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<ViewType | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = () => {
    setIsExiting(true);
    if (onExit) {
      onExit();
    }
    setTimeout(() => {
      navigate('/');
    }, 600);
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-border/30">
      <div className="flex items-center justify-between px-4 md:px-8 py-4">
        {/* Back to Dashboard Button */}
        <button
          onClick={handleExit}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground",
            "hover:text-foreground rounded-2xl hover:bg-muted/50",
            "transition-all duration-500 ease-out group",
            isExiting && "opacity-0 -translate-x-4"
          )}
        >
          <ArrowLeft className="h-4 w-4 transition-all duration-300 group-hover:-translate-x-1 group-hover:scale-110" />
          <span className="hidden sm:inline font-medium">Dashboard</span>
        </button>

        {/* Center Navigation - Pill Style */}
        <div className="flex items-center gap-0.5 bg-muted/40 backdrop-blur-xl rounded-full p-1.5 border border-border/20">
          {navItems.map((item, index) => {
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
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium",
                  "transition-all duration-500 ease-out",
                  isActive
                    ? "bg-foreground text-background shadow-lg"
                    : "text-muted-foreground hover:text-foreground",
                  isHovered && !isActive && "bg-muted/60"
                )}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-all duration-300",
                  (isActive || isHovered) && "scale-110"
                )} />
                <span className="hidden md:inline">{item.label}</span>
                
                {/* Apple-style notification badge */}
                {showBadge && (
                  <span className={cn(
                    "absolute -top-1 -right-1 min-w-[20px] h-5",
                    "flex items-center justify-center",
                    "bg-destructive text-destructive-foreground",
                    "text-[11px] font-bold rounded-full px-1.5",
                    "shadow-lg shadow-destructive/30",
                    "animate-pulse"
                  )}>
                    {pendingApprovals > 99 ? '99+' : pendingApprovals}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Logo with animated gradient effect */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            {/* Gradient glow behind logo */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-gradient" />
            
            {/* Logo container */}
            <div className="relative flex items-center gap-2 px-3 py-2 rounded-2xl transition-all duration-500 group-hover:bg-muted/30">
              <img 
                src={fldrLogo} 
                alt="fldr" 
                className="h-7 w-auto transition-all duration-500 group-hover:scale-105 dark:invert"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
