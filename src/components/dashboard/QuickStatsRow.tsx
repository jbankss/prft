import { Card } from '@/components/ui/card';
import { ShoppingCart, Users, DollarSign, AlertCircle } from 'lucide-react';
interface QuickStatsRowProps {
  ordersToday: number;
  activeVendors: number;
  avgOrderValue: number;
  pendingPayments: number;
}
export function QuickStatsRow({
  ordersToday,
  activeVendors,
  avgOrderValue,
  pendingPayments
}: QuickStatsRowProps) {
  const stats = [{
    label: 'Orders Today',
    value: ordersToday,
    icon: ShoppingCart,
    color: 'text-foreground',
    bgColor: 'bg-muted'
  }, {
    label: 'Active Vendors',
    value: activeVendors,
    icon: Users,
    color: 'text-foreground',
    bgColor: 'bg-muted'
  }, {
    label: 'Avg Order Value',
    value: `$${avgOrderValue.toLocaleString('en-US', {
      minimumFractionDigits: 2
    })}`,
    icon: DollarSign,
    color: 'text-foreground',
    bgColor: 'bg-muted'
  }, {
    label: 'Pending Payments',
    value: `$${pendingPayments.toLocaleString('en-US', {
      minimumFractionDigits: 2
    })}`,
    icon: AlertCircle,
    color: 'text-foreground',
    bgColor: 'bg-muted'
  }];
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map(stat => {
      const Icon = stat.icon;
      return <Card key={stat.label}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                <p className="font-display font-semibold text-2xl truncate" title={String(stat.value)}>
                  {stat.value}
                </p>
              </div>
              <div className={`p-4 rounded-full ${stat.bgColor} flex-shrink-0`}>
                <Icon className={`w-7 h-7 ${stat.color}`} />
              </div>
            </div>
          </Card>;
    })}
    </div>;
}