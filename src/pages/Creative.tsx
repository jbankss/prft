import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { useAuth } from '@/hooks/useAuth';
import { ClipboardCheck } from 'lucide-react';
import { IntegratedUpload } from '@/components/creative/IntegratedUpload';
import { BulkActions } from '@/components/creative/BulkActions';
import { StorageView } from '@/components/creative/StorageView';
import { AnalyticsView } from '@/components/creative/AnalyticsView';
import { FldrHome } from '@/components/fldr/FldrHome';
import { FldrTopNav } from '@/components/fldr/FldrTopNav';
import { AssetMarketplace } from '@/components/fldr/AssetMarketplace';
import { FloatingAssistant } from '@/components/global/FloatingAssistant';
import { cn } from '@/lib/utils';
import fldrLogo from '@/assets/fldr-logo.png';

type ViewType = 'overview' | 'assets' | 'upload' | 'analytics' | 'storage' | 'approvals';

export default function Creative() {
  const { user, loading: authLoading } = useAuth();
  const { currentBrand, availableBrands, loading: brandsLoading } = useBrandContext();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [portalPhase, setPortalPhase] = useState<'entering' | 'ready' | 'exiting'>('entering');
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

  // Portal entrance animation sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setPortalPhase('ready');
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    fetchCollections();
    fetchPendingApprovals();
  };

  const handleExit = () => {
    setPortalPhase('exiting');
  };

  // Auth checks
  if (authLoading || brandsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (availableBrands.length === 0) {
    return <Navigate to="/" />;
  }

  // Loading state with portal animation
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        {/* Portal effect backdrop */}
        <div className="absolute inset-0 fldr-portal-backdrop bg-background" />
        
        {/* Animated logo entrance */}
        <div className="relative flex flex-col items-center gap-6 fldr-portal-enter">
          {/* Glow rings */}
          <div className="absolute inset-0 -m-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 via-accent/20 to-primary/10 blur-3xl animate-pulse" />
          </div>
          
          {/* Logo with gradient effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/40 to-primary/30 rounded-3xl blur-2xl animate-gradient" />
            <img 
              src={fldrLogo} 
              alt="fldr" 
              className="relative h-24 w-auto dark:invert"
            />
          </div>
          
          <div className="text-sm text-muted-foreground animate-pulse">
            Entering creative space...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "min-h-screen bg-background",
        portalPhase === 'entering' && "fldr-portal-enter",
        portalPhase === 'exiting' && "fldr-portal-exit"
      )}
    >
      {/* Portal transition overlay during entrance */}
      {portalPhase === 'entering' && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-50" />
        </div>
      )}

      {/* Fldr Navigation - the ONLY navigation visible */}
      <FldrTopNav 
        activeView={activeView}
        onViewChange={setActiveView}
        pendingApprovals={pendingApprovals}
        onExit={handleExit}
      />
      
      {/* Main Content */}
      <main 
        ref={contentRef}
        className={cn(
          "transition-all duration-700 ease-out",
          portalPhase === 'ready' 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-8"
        )}
        style={{ transitionDelay: portalPhase === 'ready' ? '200ms' : '0ms' }}
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

      {/* Floating Assistant - available within fldr */}
      <FloatingAssistant />
    </div>
  );
}
