import { Card } from '@/components/ui/card';
import { Image, HardDrive, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface CreativeWidgetsProps {
  totalAssets: number;
  storageUsed: number;
  storageTotal: number;
  recentCount: number;
  pendingApprovals?: number;
}

export function CreativeWidgets({ totalAssets, storageUsed, storageTotal, recentCount, pendingApprovals = 0 }: CreativeWidgetsProps) {
  const storagePercent = Math.round((storageUsed / storageTotal) * 100);
  const storageUsedGB = (storageUsed / (1024 * 1024 * 1024)).toFixed(2);
  const storageTotalGB = (storageTotal / (1024 * 1024 * 1024)).toFixed(0);
  const showPendingWidget = pendingApprovals > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="p-8 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium uppercase tracking-wide opacity-90">Total Assets</h3>
          <Image className="w-6 h-6 opacity-75" />
        </div>
        <div className="text-5xl font-display font-bold mb-2">{totalAssets}</div>
        <p className="text-sm opacity-75">All creative files</p>
      </Card>

      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Storage</h3>
          <HardDrive className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-5xl font-display font-bold mb-4">{storageUsedGB} GB</div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{storagePercent}%</span>
        </div>
        <p className="text-sm text-muted-foreground">of {storageTotalGB} GB</p>
      </Card>

      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Recent Activity</h3>
          <Clock className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-5xl font-display font-bold mb-2">{recentCount}</div>
        <p className="text-sm text-muted-foreground">Uploads this week</p>
      </Card>

      {showPendingWidget ? (
        <Card className="p-8 bg-amber-500 text-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium uppercase tracking-wide opacity-90">Pending Approval</h3>
            <AlertCircle className="w-6 h-6 opacity-75" />
          </div>
          <div className="text-5xl font-display font-bold mb-2">{pendingApprovals}</div>
          <p className="text-sm opacity-75">Sessions awaiting review</p>
        </Card>
      ) : (
        <Card className="p-8 bg-gold text-gold-foreground">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium uppercase tracking-wide opacity-90">Performance</h3>
            <TrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <div className="text-5xl font-display font-bold mb-2">+12%</div>
          <p className="text-sm opacity-75">vs last month</p>
        </Card>
      )}
    </div>
  );
}
