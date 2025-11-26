import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Package, Calendar } from 'lucide-react';
import { useBrandContext } from '@/hooks/useBrandContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function AccountsWidgets() {
  const { currentBrand } = useBrandContext();
  const [metrics, setMetrics] = useState({
    totalPL: 0,
    totalAccounts: 0,
    totalInventoryValue: 0,
    avgDaysBetweenOrders: 0,
  });

  useEffect(() => {
    if (!currentBrand?.id) return;

    const fetchMetrics = async () => {
      // Fetch accounts for current brand
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*, charges(*), invoices(*)')
        .eq('brand_id', currentBrand.id);

      if (!accounts) return;

      // Calculate example metrics
      const totalAccounts = accounts.length;
      
      // Example P&L calculation (using balance as proxy for now)
      const totalPL = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
      
      // Example inventory value (simulated)
      const totalInventoryValue = totalAccounts * 15000;
      
      // Example avg days between orders (simulated)
      const avgDaysBetweenOrders = 24;

      setMetrics({
        totalPL,
        totalAccounts,
        totalInventoryValue,
        avgDaysBetweenOrders,
      });
    };

    fetchMetrics();
  }, [currentBrand?.id]);

  const widgets = [
    {
      title: 'Total P&L',
      value: `$${metrics.totalPL.toLocaleString()}`,
      icon: DollarSign,
      trend: metrics.totalPL >= 0 ? '+' : '-',
      color: metrics.totalPL >= 0 ? 'text-green-500' : 'text-red-500',
    },
    {
      title: 'Active Accounts',
      value: metrics.totalAccounts.toString(),
      icon: TrendingUp,
      trend: '+2 this month',
      color: 'text-blue-500',
    },
    {
      title: 'Inventory Value',
      value: `$${metrics.totalInventoryValue.toLocaleString()}`,
      icon: Package,
      trend: 'Est. value',
      color: 'text-purple-500',
    },
    {
      title: 'Avg. Order Cycle',
      value: `${metrics.avgDaysBetweenOrders} days`,
      icon: Calendar,
      trend: 'Between orders',
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-4">
      {widgets.map((widget) => (
        <Card 
          key={widget.title} 
          className="animated-gradient-slow hover-lift cursor-pointer border-border/40"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {widget.title}
            </CardTitle>
            <widget.icon className={`h-4 w-4 ${widget.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{widget.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {widget.trend}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
