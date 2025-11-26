import { Card } from '@/components/ui/card';
import { Image, HardDrive, Clock, TrendingUp } from 'lucide-react';

interface CreativeWidgetsProps {
  totalAssets: number;
  storageUsed: number;
  storageTotal: number;
  recentCount: number;
}

export function CreativeWidgets({ totalAssets, storageUsed, storageTotal, recentCount }: CreativeWidgetsProps) {
  const storagePercent = Math.round((storageUsed / storageTotal) * 100);
  const storageUsedGB = (storageUsed / (1024 * 1024 * 1024)).toFixed(2);
  const storageTotalGB = (storageTotal / (1024 * 1024 * 1024)).toFixed(0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-6 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium opacity-90">Total Assets</h3>
          <Image className="w-5 h-5 opacity-75" />
        </div>
        <div className="text-3xl font-bold">{totalAssets}</div>
        <p className="text-xs opacity-75 mt-2">All creative files</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Storage</h3>
          <HardDrive className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-3xl font-bold">{storageUsedGB} GB</div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{storagePercent}%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">of {storageTotalGB} GB</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Recent Activity</h3>
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-3xl font-bold">{recentCount}</div>
        <p className="text-xs text-muted-foreground mt-2">Uploads this week</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Performance</h3>
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-3xl font-bold">+12%</div>
        <p className="text-xs text-muted-foreground mt-2">vs last month</p>
      </Card>
    </div>
  );
}
