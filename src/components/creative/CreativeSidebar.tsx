import { LayoutGrid, Upload, FolderOpen, BarChart3, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CreativeSidebarProps {
  activeView: 'overview' | 'assets' | 'upload' | 'collections' | 'analytics' | 'storage';
  onViewChange: (view: CreativeSidebarProps['activeView']) => void;
}

export function CreativeSidebar({ activeView, onViewChange }: CreativeSidebarProps) {
  const menuItems = [
    { id: 'overview' as const, icon: LayoutGrid, label: 'Overview' },
    { id: 'assets' as const, icon: FolderOpen, label: 'Assets' },
    { id: 'upload' as const, icon: Upload, label: 'Upload' },
    { id: 'collections' as const, icon: FolderOpen, label: 'Collections' },
    { id: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
    { id: 'storage' as const, icon: HardDrive, label: 'Storage' },
  ];

  return (
    <aside className="w-24 bg-card border-r border-border flex flex-col items-center py-8 gap-6">
      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
        <LayoutGrid className="w-7 h-7 text-primary-foreground" />
      </div>

      <div className="flex flex-col gap-3 w-full items-center">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              onClick={() => onViewChange(item.id)}
              className={`w-14 h-14 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
              title={item.label}
            >
              <Icon className="w-6 h-6" />
            </Button>
          );
        })}
      </div>
    </aside>
  );
}
