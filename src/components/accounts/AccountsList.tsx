import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, MoreHorizontal, Pencil, Trash2, ExternalLink, ShoppingBag, Package, User } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMockupMode } from '@/hooks/useMockupMode';
import { AccountDetailsInline } from './AccountDetailsInline';

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

// Helper to determine account source from notes
const getAccountSource = (notes?: string): 'shopify' | 'brandboom' | 'manual' => {
  if (!notes) return 'manual';
  const lowerNotes = notes.toLowerCase();
  if (lowerNotes.includes('shopify')) return 'shopify';
  if (lowerNotes.includes('brandboom')) return 'brandboom';
  return 'manual';
};

const SourceBadge = ({ source }: { source: 'shopify' | 'brandboom' | 'manual' }) => {
  switch (source) {
    case 'shopify':
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">
          <ShoppingBag className="h-3 w-3 mr-1" />
          Shopify
        </Badge>
      );
    case 'brandboom':
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20">
          <Package className="h-3 w-3 mr-1" />
          BrandBoom
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
          <User className="h-3 w-3 mr-1" />
          Manual
        </Badge>
      );
  }
};

export function AccountsList({
  accounts,
  brands,
  onRefresh,
}: {
  accounts: Account[];
  brands: any[];
  onRefresh: () => void;
}) {
  const { inflateNumber, inflateString, sessionSeed } = useMockupMode();
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<Account | null>(null);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);
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

  // Simplified metrics - just balance owed (with mockup inflation)
  const getBalance = (account: Account) => {
    const manualBalance = Number(account.manual_balance || 0);
    const unpaidInvoices = (account.invoices || [])
      .filter((inv: any) => inv.status !== 'paid')
      .reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
    const rawBalance = manualBalance + unpaidInvoices;
    return inflateNumber(rawBalance, 'balance');
  };

  // Inflate account name for mockup mode
  const getDisplayName = (account: Account) => {
    return inflateString(account.account_name, 'vendor') || account.account_name;
  };

  return (
    <>
      {/* Compact List Layout */}
      <div className="space-y-2">
        {accounts.map((account, index) => {
          const balance = getBalance(account);
          const invoiceCount = (account.invoices || []).filter((i: any) => i.status !== 'paid').length;

          return (
            <Card 
              key={account.id} 
              className="group hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => setSelectedAccountForDetails(account)}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: 'fadeIn 0.3s ease-out forwards'
              }}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Icon + Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                        {getDisplayName(account)}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={account.status === 'active' ? 'default' : 'secondary'} 
                          className="text-[10px] px-1.5 py-0"
                        >
                          {account.status}
                        </Badge>
                        <SourceBadge source={getAccountSource(account.notes)} />
                        {invoiceCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {invoiceCount} unpaid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Balance + Actions */}
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm sm:text-base font-semibold ${balance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {balance > 0 ? `-$${balance.toLocaleString()}` : '$0'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">balance</p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAccountForDetails(account);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border border-border">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAccountForEdit(account);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              setAccountToDelete(account);
                            }} 
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Account Details Dialog */}
      <Dialog 
        open={!!selectedAccountForDetails} 
        onOpenChange={(open) => !open && setSelectedAccountForDetails(null)}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-xl">{selectedAccountForDetails?.account_name}</span>
                <Badge 
                  variant={selectedAccountForDetails?.status === 'active' ? 'default' : 'secondary'} 
                  className="ml-3"
                >
                  {selectedAccountForDetails?.status}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto -mx-6 px-6">
            {selectedAccountForDetails && (
              <AccountDetailsInline
                accountId={selectedAccountForDetails.id}
                onRefresh={onRefresh}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog - TODO: Extend AccountDialog to support editing */}
      {selectedAccountForEdit && (
        <Dialog 
          open={!!selectedAccountForEdit} 
          onOpenChange={(open) => !open && setSelectedAccountForEdit(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Editing coming soon. For now, use the details view to manage invoices and charges.
            </p>
            <Button onClick={() => setSelectedAccountForEdit(null)}>Close</Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
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