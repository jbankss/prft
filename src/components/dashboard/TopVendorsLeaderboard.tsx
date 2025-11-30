import { Card } from '@/components/ui/card';
import { Crown, TrendingUp } from 'lucide-react';

interface TopVendorsLeaderboardProps {
  vendors: { name: string; revenue: number; orderCount: number; avgOrderValue: number }[];
}

export function TopVendorsLeaderboard({ vendors }: TopVendorsLeaderboardProps) {
  const maxRevenue = vendors[0]?.revenue || 1;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Top Vendors</h3>
        <Crown className="w-5 h-5 text-yellow-500" />
      </div>

      <div className="space-y-4">
        {vendors.map((vendor, index) => {
          const percentage = (vendor.revenue / maxRevenue) * 100;
          
          return (
            <div key={vendor.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium truncate max-w-[150px]">{vendor.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    ${vendor.revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vendor.orderCount} orders
                  </div>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
