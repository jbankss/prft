import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { ClipboardCheck } from 'lucide-react';
import { IntegratedUpload } from '@/components/creative/IntegratedUpload';
import { BulkActions } from '@/components/creative/BulkActions';
import { StorageView } from '@/components/creative/StorageView';
import { AnalyticsView } from '@/components/creative/AnalyticsView';
import { FldrHome } from '@/components/fldr/FldrHome';
import { FldrTopNav } from '@/components/fldr/FldrTopNav';
import { AssetMarketplace } from '@/components/fldr/AssetMarketplace';
import { cn } from '@/lib/utils';

type ViewType = 'overview' | 'assets' | 'upload' | 'analytics' | 'storage' | 'approvals';

export default function Creative() {
  const isMobile = useIsMobile();
  const { currentBrand } = useBrandContext();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [hasEntered, setHasEntered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
        // Trigger entrance animation after load
        setTimeout(() => setHasEntered(true), 100);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <span className="text-2xl font-display font-bold text-primary">f</span>
          </div>
          <div className="text-sm text-muted-foreground animate-pulse">Loading fldr...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "min-h-screen bg-background transition-all duration-700 ease-out",
        hasEntered 
          ? "opacity-100 scale-100" 
          : "opacity-0 scale-95"
      )}
    >
      {/* Animated Top Navigation */}
      <FldrTopNav 
        activeView={activeView}
        onViewChange={setActiveView}
        pendingApprovals={pendingApprovals}
      />
      
      {/* Main Content */}
      <main 
        ref={contentRef}
        className={cn(
          "transition-all duration-500 ease-out",
          hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
        style={{ transitionDelay: hasEntered ? '150ms' : '0ms' }}
      >
        <div className="p-4 md:p-6 lg:p-8">
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

          {/* Approvals View */}
          {activeView === 'approvals' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-display font-semibold mb-2">Approval Queue</h2>
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
