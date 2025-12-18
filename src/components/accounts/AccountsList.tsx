import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Building2, MoreHorizontal, Pencil, Trash2, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccountDetailsInline } from './AccountDetailsInline';
import { AccountDialog } from './AccountDialog';

interface Account {
  id: string;
  account_name: string;
  balance: number;
  manual_balance?: number;
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

  // Calculate real metrics - P&L includes manual_balance and unpaid invoices as expenses
  const getAccountMetrics = (account: Account) => {
    const charges = account.charges || [];
    const invoices = account.invoices || [];
    
    const purchases = charges.reduce((sum, charge) => sum + Number(charge.amount), 0);
    
    // Calculate unpaid invoice amounts (pending/unpaid invoices count against P&L)
    const unpaidInvoiceAmount = invoices
      .filter((inv: any) => inv.status !== 'paid')
      .reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
    
    const amountOwed = Number(account.manual_balance || 0);
    
    // For now, sales is 0 since shopify_orders are at brand level, not account level
    // P&L = -purchases - amountOwed - unpaidInvoices (all expenses)
    const profitLoss = -(purchases + amountOwed + unpaidInvoiceAmount);
    
    const totalExpenses = purchases + amountOwed + unpaidInvoiceAmount;
    
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

    return {
      purchases,
      amountOwed,
      unpaidInvoiceAmount,
      profitLoss,
      totalExpenses,
      avgDaysBetweenOrders: avgDaysBetweenOrders || 30,
    };
  };

  return (
    <>
      {/* Compact Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((account) => {
          const metrics = getAccountMetrics(account);
          const isExpanded = expandedAccounts[account.id];

          return (
            <Card key={account.id} className="hover-lift">
              <CardContent className="p-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base truncate">{account.account_name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{account.brands?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={account.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {account.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border border-border">
                        <DropdownMenuItem onClick={() => handleEdit(account)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAccountToDelete(account)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount Owed</p>
                    <p className="text-sm font-semibold text-destructive">
                      ${metrics.amountOwed.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unpaid Invoices</p>
                    <p className="text-sm font-semibold text-destructive">
                      ${metrics.unpaidInvoiceAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Purchases</p>
                    <p className="text-sm font-semibold">${metrics.purchases.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net P&L</p>
                    <p className={`text-sm font-semibold flex items-center gap-1 ${metrics.profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {metrics.profitLoss >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {metrics.profitLoss >= 0 ? '+' : ''}${metrics.profitLoss.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Expand Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => toggleAccount(account.id)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      View Details
                    </>
                  )}
                </Button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pt-3 mt-3 border-t border-border/50">
                    <AccountDetailsInline
                      accountId={account.id}
                      onRefresh={onRefresh}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
    </>
  );
}
