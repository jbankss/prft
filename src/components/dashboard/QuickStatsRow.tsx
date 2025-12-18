import { Card } from '@/components/ui/card';
import { ShoppingCart, Users, DollarSign, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface QuickStatsRowProps {
  ordersToday: number;
  activeVendors: number;
  avgOrderValue: number;
  pendingPayments: number;
  // Comparison values (optional)
  comparisonOrdersToday?: number;
  comparisonActiveVendors?: number;
  comparisonAvgOrderValue?: number;
  comparisonPendingPayments?: number;
}

export function QuickStatsRow({
  ordersToday,
  activeVendors,
  avgOrderValue,
  pendingPayments,
  comparisonOrdersToday,
  comparisonActiveVendors,
  comparisonAvgOrderValue,
  comparisonPendingPayments,
}: QuickStatsRowProps) {
  const calculateChange = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const stats = [
    {
      label: 'Orders Today',
      value: ordersToday,
      icon: ShoppingCart,
      color: 'text-foreground',
      bgColor: 'bg-muted',
      change: calculateChange(ordersToday, comparisonOrdersToday),
    },
    {
      label: 'Active Vendors',
      value: activeVendors,
      icon: Users,
      color: 'text-foreground',
      bgColor: 'bg-muted',
      change: calculateChange(activeVendors, comparisonActiveVendors),
    },
    {
      label: 'Avg Order Value',
      value: `$${avgOrderValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      color: 'text-foreground',
      bgColor: 'bg-muted',
      change: calculateChange(avgOrderValue, comparisonAvgOrderValue),
    },
    {
      label: 'Pending Payments',
      value: `$${pendingPayments.toLocaleString('en-US', {
        minimumFractionDigits: 2,
      })}`,
      icon: AlertCircle,
      color: 'text-foreground',
      bgColor: 'bg-muted',
      change: calculateChange(pendingPayments, comparisonPendingPayments),
      invertTrend: true, // Lower pending is better
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const hasChange = stat.change !== null;
        const isPositive = stat.invertTrend 
          ? (stat.change || 0) < 0 
          : (stat.change || 0) >= 0;
        
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                <p
                  className="font-display font-semibold text-2xl truncate"
                  title={String(stat.value)}
                >
                  {stat.value}
                </p>
                {hasChange && (
                  <div className={`flex items-center gap-1 mt-1 text-sm ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(stat.change || 0).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor} flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
