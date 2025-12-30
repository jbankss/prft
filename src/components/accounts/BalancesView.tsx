import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMockupMode } from '@/hooks/useMockupMode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Package, ShoppingCart, Percent } from 'lucide-react';

interface BalanceMetrics {
  accountId: string;
  accountName: string;
  totalCOGS: number; // Cost of Goods Sold (what we paid brands)
  totalRevenue: number; // What we sold for
  grossProfit: number; // Revenue - COGS
  marginPercent: number; // (Gross Profit / Revenue) * 100
  outstandingBalance: number;
  inventoryValue: number; // COGS of unsold items
  roi: number; // Return on Investment
}

export function BalancesView({ brandId }: { brandId: string }) {
  const { inflateNumber, inflateString, sessionSeed } = useMockupMode();
  const [balances, setBalances] = useState<BalanceMetrics[]>([]);
  const [totals, setTotals] = useState({
    totalCOGS: 0,
    totalRevenue: 0,
    grossProfit: 0,
    avgMargin: 0,
    totalBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();

    const channel = supabase
      .channel('balances-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, fetchBalances)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charges' }, fetchBalances)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchBalances)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId]);

  const fetchBalances = async () => {
    try {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*, charges(*), invoices(*)')
        .eq('brand_id', brandId);

      if (error) throw error;

      const metrics: BalanceMetrics[] = accounts?.map((account) => {
        const totalCOGS = account.charges?.reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
        const totalRevenue = account.invoices?.reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
        const grossProfit = totalRevenue - totalCOGS;
        const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const roi = totalCOGS > 0 ? (grossProfit / totalCOGS) * 100 : 0;

        return {
          accountId: account.id,
          accountName: account.account_name,
          totalCOGS,
          totalRevenue,
          grossProfit,
          marginPercent,
          outstandingBalance: Number(account.balance),
          inventoryValue: totalCOGS * 0.3, // Estimate 30% unsold
          roi,
        };
      }) || [];

      setBalances(metrics);

      // Calculate totals
      const totalCOGS = metrics.reduce((sum, m) => sum + m.totalCOGS, 0);
      const totalRevenue = metrics.reduce((sum, m) => sum + m.totalRevenue, 0);
      const grossProfit = totalRevenue - totalCOGS;
      const avgMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const totalBalance = metrics.reduce((sum, m) => sum + m.outstandingBalance, 0);

      setTotals({ totalCOGS, totalRevenue, grossProfit, avgMargin, totalBalance });
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply mockup mode inflation
  const inflatedTotals = {
    totalCOGS: inflateNumber(totals.totalCOGS, 'revenue'),
    totalRevenue: inflateNumber(totals.totalRevenue, 'revenue'),
    grossProfit: inflateNumber(totals.grossProfit, 'revenue'),
    avgMargin: inflateNumber(totals.avgMargin, 'percentage'),
    totalBalance: inflateNumber(totals.totalBalance, 'balance'),
  };

  const inflatedBalances = balances.map(b => ({
    ...b,
    accountName: inflateString(b.accountName, 'vendor') || b.accountName,
    totalCOGS: inflateNumber(b.totalCOGS, 'revenue'),
    totalRevenue: inflateNumber(b.totalRevenue, 'revenue'),
    grossProfit: inflateNumber(b.grossProfit, 'revenue'),
    marginPercent: inflateNumber(b.marginPercent, 'percentage'),
    outstandingBalance: inflateNumber(b.outstandingBalance, 'balance'),
    roi: inflateNumber(b.roi, 'percentage'),
  }));

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total COGS
            </CardDescription>
            <CardTitle className="text-2xl">${inflatedTotals.totalCOGS.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Revenue
            </CardDescription>
            <CardTitle className="text-2xl">${inflatedTotals.totalRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              {inflatedTotals.grossProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              Gross Profit
            </CardDescription>
            <CardTitle className={`text-2xl ${inflatedTotals.grossProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${Math.abs(inflatedTotals.grossProfit).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Avg Margin
            </CardDescription>
            <CardTitle className="text-2xl">{inflatedTotals.avgMargin.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Account Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Account Balances</h3>
        {inflatedBalances.map((balance) => (
          <Card key={balance.accountId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{balance.accountName}</CardTitle>
                <Badge variant={balance.grossProfit >= 0 ? 'default' : 'destructive'}>
                  {balance.marginPercent.toFixed(1)}% Margin
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">COGS</p>
                  <p className="font-semibold">${balance.totalCOGS.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                  <p className="font-semibold">${balance.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Gross Profit</p>
                  <p className={`font-semibold ${balance.grossProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${Math.abs(balance.grossProfit).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ROI</p>
                  <p className="font-semibold">{balance.roi.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
                  <p className="font-semibold">${balance.outstandingBalance.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {inflatedBalances.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No accounts found for this brand
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
