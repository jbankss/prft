import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';
import { AccountsList } from '@/components/accounts/AccountsList';
import { AccountDialog } from '@/components/accounts/AccountDialog';
import { AccountsSidebar } from '@/components/accounts/AccountsSidebar';
import { AccountsWidgets } from '@/components/accounts/AccountsWidgets';
import { ActivityTimeline } from '@/components/accounts/ActivityTimeline';
import { BalancesView } from '@/components/accounts/BalancesView';
import { PaymentsView } from '@/components/accounts/PaymentsView';
import { ImprovedCalendarView } from '@/components/accounts/ImprovedCalendarView';
import { SnapshotView } from '@/components/accounts/SnapshotView';
import { useBrandContext } from '@/hooks/useBrandContext';
import { toast } from 'sonner';
export default function Accounts() {
  const {
    currentBrand
  } = useBrandContext();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const fetchData = async () => {
    if (!currentBrand?.id) return;
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('accounts').select('*, brands(*), charges(*), invoices(*)').eq('brand_id', currentBrand.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
    const accountsChannel = supabase.channel('accounts-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'accounts'
    }, fetchData).subscribe();
    return () => {
      supabase.removeChannel(accountsChannel);
    };
  }, [currentBrand?.id]);
  if (!currentBrand) {
    return <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Select a brand from the top-right to view Brand Headquarters</p>
        </div>
      </div>;
  }
  if (loading) {
    return <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>;
  }
  return <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-card">
        <div className="px-8 py-8">
          <h1 className="text-5xl font-display font-semibold text-foreground">
            Brand Headquarters
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AccountsSidebar activeView={activeView} onViewChange={setActiveView} />

        {/* Center Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold capitalize">{activeView}</h2>
              {activeView === 'overview' && (
                <Button onClick={() => setShowAccountDialog(true)} className="hover-lift">
                  <Plus className="h-4 w-4 mr-2" />
                  New Account
                </Button>
              )}
            </div>

            {/* View Content */}
            {activeView === 'overview' && (
              accounts.length === 0 ? (
                <Card className="p-12 animated-gradient text-center border-border/40">
                  <p className="text-muted-foreground mb-4">
                    No accounts yet. Create your first account for {currentBrand.name}.
                  </p>
                  <Button onClick={() => setShowAccountDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </Card>
              ) : (
                <AccountsList accounts={accounts} brands={[currentBrand]} onRefresh={fetchData} />
              )
            )}

            {activeView === 'snapshot' && <SnapshotView brandId={currentBrand.id} />}
            {activeView === 'activity' && <ActivityTimeline brandId={currentBrand.id} />}
            {activeView === 'balances' && <BalancesView brandId={currentBrand.id} />}
            {activeView === 'payments' && <PaymentsView brandId={currentBrand.id} />}
            {activeView === 'calendar' && <ImprovedCalendarView brandId={currentBrand.id} />}
          </div>
        </div>

        {/* Right Sidebar - Widgets (only on overview) */}
        {activeView === 'overview' && (
          <div className="w-80 border-l border-border/50 bg-card p-8 overflow-auto">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-6">
              Performance Metrics
            </h3>
            <AccountsWidgets />
          </div>
        )}
      </div>

      <AccountDialog open={showAccountDialog} onOpenChange={setShowAccountDialog} brands={[currentBrand]} onSuccess={fetchData} />
    </div>;
}