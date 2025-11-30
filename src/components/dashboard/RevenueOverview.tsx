import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface RevenueOverviewProps {
  todayRevenue: number;
  yesterdayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
}

export function RevenueOverview({ todayRevenue, yesterdayRevenue, weekRevenue, monthRevenue }: RevenueOverviewProps) {
  const todayChange = yesterdayRevenue > 0 
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
    : 0;
  const isPositive = todayChange >= 0;

  return (
    <Card className="p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-6">Revenue Overview</h3>
      
      <div className="space-y-6">
        {/* Today */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Today</span>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(todayChange).toFixed(1)}%</span>
            </div>
          </div>
          <div className="text-4xl font-bold">
            ${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Week */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">This Week</div>
          <div className="text-2xl font-semibold">
            ${weekRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Month */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">This Month</div>
          <div className="text-2xl font-semibold">
            ${monthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </Card>
  );
}
