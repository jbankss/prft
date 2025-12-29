import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Upload, BarChart3, HardDrive, Image, ClipboardCheck } from 'lucide-react';
import { CreativeSidebar } from '@/components/creative/CreativeSidebar';
import { IntegratedUpload } from '@/components/creative/IntegratedUpload';
import { BulkActions } from '@/components/creative/BulkActions';
import { StorageView } from '@/components/creative/StorageView';
import { AnalyticsView } from '@/components/creative/AnalyticsView';
import { FldrHome } from '@/components/fldr/FldrHome';
import { AssetMarketplace } from '@/components/fldr/AssetMarketplace';
import { toast } from 'sonner';

type ViewType = 'overview' | 'assets' | 'upload' | 'analytics' | 'storage' | 'approvals';

export default function Creative() {
  const isMobile = useIsMobile();
  const { currentBrand } = useBrandContext();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const fetchCollections = async () => {
    if (!currentBrand) return;
    try {
      const { data, error } = await supabase
        .from('asset_collections')
        .select('*')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCollections(data || []);
    } catch (error: any) {
      console.error('Failed to fetch collections:', error);
    }
  };

  const fetchPendingApprovals = async () => {
    if (!currentBrand) return;
    try {
      const { count, error } = await supabase
        .from('upload_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id)
        .eq('status', 'pending_approval');
      if (error) throw error;
      setPendingApprovals(count || 0);
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
    }
  };

  useEffect(() => {
    if (currentBrand) {
      setLoading(true);
      Promise.all([fetchCollections(), fetchPendingApprovals()]).finally(() => {
        setLoading(false);
      });

      const channel = supabase
        .channel('fldr-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'asset_collections'
        }, fetchCollections)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'upload_sessions'
        }, fetchPendingApprovals)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentBrand]);

  const handleRefresh = () => {
    fetchCollections();
    fetchPendingApprovals();
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        {!isMobile && (
          <CreativeSidebar 
            activeView={activeView} 
            onViewChange={setActiveView} 
            pendingApprovals={pendingApprovals}
          />
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Desktop: Show sidebar */}
      {!isMobile && (
        <CreativeSidebar 
          activeView={activeView} 
          onViewChange={setActiveView}
          pendingApprovals={pendingApprovals}
        />
      )}
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* Mobile: Tab navigation */}
          {isMobile && (
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewType)} className="w-full">
              <TabsList className="w-full grid grid-cols-5 h-auto">
                <TabsTrigger value="overview" className="flex flex-col gap-1 py-2">
                  <Home className="h-4 w-4" />
                  <span className="text-[10px]">Home</span>
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex flex-col gap-1 py-2">
                  <Image className="h-4 w-4" />
                  <span className="text-[10px]">Assets</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex flex-col gap-1 py-2">
                  <Upload className="h-4 w-4" />
                  <span className="text-[10px]">Upload</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex flex-col gap-1 py-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-[10px]">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="storage" className="flex flex-col gap-1 py-2">
                  <HardDrive className="h-4 w-4" />
                  <span className="text-[10px]">Storage</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-semibold">
                {activeView === 'overview' && 'fldr'}
                {activeView === 'assets' && 'Assets'}
                {activeView === 'upload' && 'Upload'}
                {activeView === 'approvals' && 'Approvals'}
                {activeView === 'analytics' && 'Analytics'}
                {activeView === 'storage' && 'Storage'}
              </h1>
              {activeView === 'overview' && (
                <p className="text-muted-foreground mt-1">Your creative asset hub</p>
              )}
            </div>
          </div>

          {/* Overview - FldrHome */}
          {activeView === 'overview' && (
            <FldrHome 
              onNavigateToAssets={() => setActiveView('assets')}
              onNavigateToUpload={() => setActiveView('upload')}
            />
          )}

          {/* Assets View - Marketplace */}
          {activeView === 'assets' && (
            <div className="-m-4 md:-m-6 lg:-m-8">
              <AssetMarketplace onRefresh={handleRefresh} />
            </div>
          )}

          <BulkActions 
            selectedIds={selectedIds} 
            onClearSelection={() => setSelectedIds([])} 
            onRefresh={handleRefresh} 
            collections={collections} 
          />

          {/* Upload View */}
          {activeView === 'upload' && <IntegratedUpload onSuccess={handleRefresh} />}

          {/* Approvals View - Placeholder for Phase 5 */}
          {activeView === 'approvals' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Approval Queue</h2>
              <p className="text-muted-foreground max-w-md">
                Review and approve pending uploads from your team. 
                {pendingApprovals > 0 
                  ? ` You have ${pendingApprovals} pending approval${pendingApprovals > 1 ? 's' : ''}.`
                  : ' No pending approvals at this time.'}
              </p>
            </div>
          )}

          {/* Analytics View */}
          {activeView === 'analytics' && <AnalyticsView />}

          {/* Storage View */}
          {activeView === 'storage' && <StorageView />}
        </div>
      </main>
    </div>
  );
}
