import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { AccountsList } from '@/components/accounts/AccountsList';
import { AccountDialog } from '@/components/accounts/AccountDialog';
import { BrandDialog } from '@/components/accounts/BrandDialog';
import { BrandCard } from '@/components/accounts/BrandCard';
import { BrandDetailsDialog } from '@/components/accounts/BrandDetailsDialog';
import { toast } from 'sonner';

export default function Accounts() {
  const [brands, setBrands] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

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
      </div>

      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSelectedBrand(null);
                setShowBrandDialog(true);
              }}
              className="transition-all duration-200 hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Brand
            </Button>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {brands.map((brand) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  onEdit={() => {
                    setSelectedBrand(brand);
                    setShowBrandDialog(true);
                  }}
                  onClick={() => setSelectedBrandId(brand.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowAccountDialog(true)}
              disabled={brands.length === 0}
              className="transition-all duration-200 hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Account
            </Button>
          </div>

          {brands.length === 0 ? (
            <Card className="p-12 glass shadow-apple-md text-center">
              <p className="text-muted-foreground mb-4">Create a brand first before adding accounts.</p>
            </Card>
          ) : accounts.length === 0 ? (
            <Card className="p-12 glass shadow-apple-md text-center">
              <p className="text-muted-foreground mb-4">No accounts yet. Create your first account.</p>
              <Button onClick={() => setShowAccountDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Account
              </Button>
            </Card>
          ) : (
            <AccountsList accounts={accounts} brands={brands} onRefresh={fetchData} />
          )}
        </TabsContent>
      </Tabs>

      <BrandDialog
        open={showBrandDialog}
        onOpenChange={(open) => {
          setShowBrandDialog(open);
          if (!open) setSelectedBrand(null);
        }}
        onSuccess={fetchData}
        brand={selectedBrand}
      />

      <BrandDetailsDialog
        brandId={selectedBrandId}
        onClose={() => setSelectedBrandId(null)}
        onRefresh={fetchData}
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