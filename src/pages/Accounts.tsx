import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AccountsList } from '@/components/accounts/AccountsList';
import { AccountDialog } from '@/components/accounts/AccountDialog';
import { BrandDialog } from '@/components/accounts/BrandDialog';
import { toast } from 'sonner';

export default function Accounts() {
  const [brands, setBrands] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);

  const fetchData = async () => {
    try {
      const [brandsRes, accountsRes] = await Promise.all([
        supabase.from('brands').select('*').order('created_at', { ascending: false }),
        supabase.from('accounts').select('*, brands(*)').order('created_at', { ascending: false }),
      ]);

      if (brandsRes.error) throw brandsRes.error;
      if (accountsRes.error) throw accountsRes.error;

      setBrands(brandsRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (error: any) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const brandsChannel = supabase
      .channel('brands-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brands' }, fetchData)
      .subscribe();

    const accountsChannel = supabase
      .channel('accounts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(brandsChannel);
      supabase.removeChannel(accountsChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Account Management</h1>
          <p className="text-muted-foreground">Manage brands, accounts, invoices, and charges</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowBrandDialog(true)}
            className="transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Brand
          </Button>
          <Button
            onClick={() => setShowAccountDialog(true)}
            disabled={brands.length === 0}
            className="transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Account
          </Button>
        </div>
      </div>

      {brands.length === 0 ? (
        <Card className="p-12 glass shadow-apple-md text-center">
          <p className="text-muted-foreground mb-4">No brands yet. Create your first brand to get started.</p>
          <Button onClick={() => setShowBrandDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Brand
          </Button>
        </Card>
      ) : (
        <AccountsList accounts={accounts} brands={brands} onRefresh={fetchData} />
      )}

      <BrandDialog
        open={showBrandDialog}
        onOpenChange={setShowBrandDialog}
        onSuccess={fetchData}
      />

      <AccountDialog
        open={showAccountDialog}
        onOpenChange={setShowAccountDialog}
        brands={brands}
        onSuccess={fetchData}
      />
    </div>
  );
}