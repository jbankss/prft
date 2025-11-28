import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, FileText, Receipt, MessageSquare, Pencil, TrendingUp, TrendingDown, Package, Calendar, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccountDetails } from './AccountDetails';
import { AccountDialog } from './AccountDialog';

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
  charges?: any[];
  invoices?: any[];
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
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  useEffect(() => {
    // Subscribe to real-time changes
    const channel = supabase
      .channel('accounts-real-time')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charges' }, onRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, onRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, onRefresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);

  const toggleAccount = (accountId: string) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountToDelete.id);

      if (error) throw error;

      toast.success(`Account "${accountToDelete.account_name}" deleted successfully`);
      setAccountToDelete(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  // Calculate real metrics from actual data
  const getAccountMetrics = (account: Account) => {
    const charges = account.charges || [];
    const invoices = account.invoices || [];
    
    const purchases = charges.reduce((sum, charge) => sum + Number(charge.amount), 0);
    const sales = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const profitLoss = sales - purchases;
    const profitMargin = purchases > 0 ? ((profitLoss / purchases) * 100).toFixed(1) : '0.0';
    
    // Calculate average days between charges
    const chargeDates = charges.map((c: any) => new Date(c.charge_date).getTime()).sort();
    let avgDaysBetweenOrders = 0;
    if (chargeDates.length > 1) {
      const differences = [];
      for (let i = 1; i < chargeDates.length; i++) {
        differences.push((chargeDates[i] - chargeDates[i - 1]) / (1000 * 60 * 60 * 24));
      }
      avgDaysBetweenOrders = Math.round(differences.reduce((a, b) => a + b, 0) / differences.length);
    }
    
    const lastOrderDate = chargeDates.length > 0 
      ? new Date(chargeDates[chargeDates.length - 1])
      : new Date();

    return {
      purchases,
      sales,
      profitLoss,
      profitMargin: Number(profitMargin),
      avgDaysBetweenOrders: avgDaysBetweenOrders || 30,
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
                    variant="ghost"
                    size="sm"
                    onClick={() => setAccountToDelete(account)}
                  >
                    <Trash2 className="h-4 w-4" />
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

      {selectedAccount && (
        <AccountDialog
          open={!!selectedAccount}
          onOpenChange={(open) => !open && setSelectedAccount(null)}
          brands={brands}
          onSuccess={() => {
            setSelectedAccount(null);
            onRefresh();
          }}
        />
      )}

      <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{accountToDelete?.account_name}"? This action cannot be undone.
              All associated invoices and charges will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
