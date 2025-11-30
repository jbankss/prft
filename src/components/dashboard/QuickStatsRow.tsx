import { Card } from '@/components/ui/card';
import { ShoppingCart, Users, DollarSign, AlertCircle } from 'lucide-react';

interface QuickStatsRowProps {
  ordersToday: number;
  activeVendors: number;
  avgOrderValue: number;
  pendingPayments: number;
}

export function QuickStatsRow({ ordersToday, activeVendors, avgOrderValue, pendingPayments }: QuickStatsRowProps) {
  const stats = [
    {
      label: 'Orders Today',
      value: ordersToday,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Active Vendors',
      value: activeVendors,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Avg Order Value',
      value: `$${avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Pending Payments',
      value: `$${pendingPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
