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
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*, charges(*), invoices(*)')
        .eq('brand_id', currentBrand.id);

      if (!accounts) return;

      // Calculate real P&L from actual data
      let totalPL = 0;
      accounts.forEach((account) => {
        const revenue = account.invoices?.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0) || 0;
        const costs = account.charges?.reduce((sum: number, charge: any) => sum + Number(charge.amount), 0) || 0;
        totalPL += (revenue - costs);
      });

      // Calculate inventory value from account balances
      const totalInventoryValue = accounts.reduce((sum, acc) => sum + Math.abs(Number(acc.balance)), 0);

      // Calculate average days between orders from all charges
      const allCharges = accounts.flatMap(acc => acc.charges || []);
      const chargeDates = allCharges.map(c => new Date(c.charge_date).getTime()).sort();
      let avgDays = 21;
      if (chargeDates.length > 1) {
        const differences = [];
        for (let i = 1; i < chargeDates.length; i++) {
          differences.push((chargeDates[i] - chargeDates[i - 1]) / (1000 * 60 * 60 * 24));
        }
        avgDays = Math.round(differences.reduce((a, b) => a + b, 0) / differences.length);
      }

      setMetrics({
        totalPL,
        totalAccounts: accounts.length,
        totalInventoryValue,
        avgDaysBetweenOrders: avgDays,
      });
    };

    fetchMetrics();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('widgets-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charges' }, fetchMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, fetchMetrics)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
