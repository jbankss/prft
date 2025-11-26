import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, FileText, Receipt, MessageSquare, Pencil, TrendingUp, TrendingDown, Package, Calendar } from 'lucide-react';
import { useState } from 'react';
import { AccountDetails } from './AccountDetails';

interface Account {
  id: string;
  account_name: string;
  balance: number;
  status: string;
  notes?: string;
  created_at: string;
  brands?: {
    name: string;
  };
}

export function AccountsList({
  accounts,
  brands,
  onRefresh,
}: {
  accounts: Account[];
  brands: any[];
  onRefresh: () => void;
}) {
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const toggleAccount = (accountId: string) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
  };

  // Calculate example metrics for each account
  const getAccountMetrics = (account: Account) => {
    // Example data - in production this would come from actual orders/sales
    const seed = account.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (Math.sin(seed) * 10000) % 1;
    
    const examplePurchases = Math.floor(random * 50000) + 10000;
    const exampleSales = examplePurchases * (1.3 + (random * 0.5)); // 30-80% markup
    const profitLoss = exampleSales - examplePurchases;
    const profitMargin = ((profitLoss / examplePurchases) * 100).toFixed(1);
    const avgDaysBetweenOrders = Math.floor(random * 30) + 15;
    const lastOrderDate = new Date(Date.now() - (random * 30 * 24 * 60 * 60 * 1000));

    return {
      purchases: examplePurchases,
      sales: exampleSales,
      profitLoss,
      profitMargin,
      avgDaysBetweenOrders,
      lastOrderDate,
    };
  };

  return (
    <div className="grid gap-4">
      {accounts.map((account) => {
        const metrics = getAccountMetrics(account);
        const isProfitable = metrics.profitLoss >= 0;

        return (
          <Card key={account.id} className="animated-gradient-slow hover-lift border-border/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{account.account_name}</CardTitle>
                    {account.brands && (
                      <CardDescription>{account.brands.name}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isProfitable ? 'default' : 'destructive'} className="gap-1">
                    {isProfitable ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isProfitable ? '+' : ''}{metrics.profitMargin}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(account)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={expandedAccounts[account.id] ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => toggleAccount(account.id)}
                  >
                    {expandedAccounts[account.id] ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Package className="h-3 w-3" />
                    <span>Total Purchases</span>
                  </div>
                  <p className="text-lg font-bold">${metrics.purchases.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <DollarSign className="h-3 w-3" />
                    <span>Total Sales</span>
                  </div>
                  <p className="text-lg font-bold">${metrics.sales.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    {isProfitable ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span>Net P&L</span>
                  </div>
                  <p className={`text-lg font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                    {isProfitable ? '+' : '-'}${Math.abs(metrics.profitLoss).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>Order Cycle</span>
                  </div>
                  <p className="text-lg font-bold">{metrics.avgDaysBetweenOrders}d</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex items-center justify-between text-sm border-t border-border/40 pt-4">
                <div>
                  <span className="text-muted-foreground">Balance: </span>
                  <span className="font-semibold">${Number(account.balance).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Order: </span>
                  <span className="font-medium">{metrics.lastOrderDate.toLocaleDateString()}</span>
                </div>
                <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                  {account.status}
                </Badge>
              </div>

              {account.notes && (
                <p className="text-sm text-muted-foreground mt-3 p-3 bg-muted/30 rounded-lg">
                  {account.notes}
                </p>
              )}

              {expandedAccounts[account.id] && (
                <div className="pt-4 mt-4 border-t border-border/40">
                  <AccountDetails 
                    accountId={account.id}
                    onClose={() => toggleAccount(account.id)}
                    onRefresh={onRefresh}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
