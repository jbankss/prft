import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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

// Portal phase timing (in ms)
const PORTAL_TIMING = {
  MELT: 1500,      // Dashboard melts away
  MORPH: 1500,     // Morphing transition
  LOGO: 1500,      // Logo ripples in
  CONTENT: 1000,   // Content reveals
  TOTAL: 5500,     // Total animation time
};

export default function Creative() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentBrand, availableBrands, loading: brandsLoading } = useBrandContext();
  const [collections, setCollections] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  
  // Portal animation states
  const [portalPhase, setPortalPhase] = useState<'loading' | 'ready' | 'exiting'>('loading');
  const [animationPhase, setAnimationPhase] = useState<1 | 2 | 3 | 4>(1);
  const [dataReady, setDataReady] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchCollections = useCallback(async () => {
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
  }, [currentBrand]);

  const fetchPendingApprovals = useCallback(async () => {
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
  }, [currentBrand]);

  // Data loading - happens in parallel with animation
  useEffect(() => {
    if (currentBrand) {
      setDataLoading(true);
      Promise.all([fetchCollections(), fetchPendingApprovals()]).finally(() => {
        setDataLoading(false);
        setDataReady(true);
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
  }, [currentBrand, fetchCollections, fetchPendingApprovals]);

  // Portal animation sequence - 5.5 seconds total
  useEffect(() => {
    // Phase 1: Already in progress (loading screen with melting effect implied)
    const phase2Timer = setTimeout(() => setAnimationPhase(2), PORTAL_TIMING.MELT);
    const phase3Timer = setTimeout(() => setAnimationPhase(3), PORTAL_TIMING.MELT + PORTAL_TIMING.MORPH);
    const phase4Timer = setTimeout(() => setAnimationPhase(4), PORTAL_TIMING.MELT + PORTAL_TIMING.MORPH + PORTAL_TIMING.LOGO);
    
    // After full animation, transition to ready (content visible)
    const readyTimer = setTimeout(() => {
      setPortalPhase('ready');
    }, PORTAL_TIMING.TOTAL);

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);
      clearTimeout(phase4Timer);
      clearTimeout(readyTimer);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    fetchCollections();
    fetchPendingApprovals();
  }, [fetchCollections, fetchPendingApprovals]);

  const handleExit = useCallback(() => {
    setPortalPhase('exiting');
    // Navigate after exit animation completes (5 seconds)
    setTimeout(() => {
      navigate('/');
    }, 5000);
  }, [navigate]);

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

  // Portal loading screen with dramatic animation
  if (portalPhase === 'loading') {
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-hidden">
        {/* Animated background layers */}
        <div className="absolute inset-0">
          {/* Liquid wave layers */}
          <div 
            className={cn(
              "absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5",
              animationPhase >= 1 && "fldr-liquid-wave"
            )}
            style={{ animationDelay: '0s' }}
          />
          <div 
            className={cn(
              "absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-accent/10",
              animationPhase >= 2 && "fldr-liquid-wave"
            )}
            style={{ animationDelay: '0.5s' }}
          />
          
          {/* Expanding rings */}
          {animationPhase >= 2 && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border border-accent/20 fldr-ring-expand" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="w-32 h-32 rounded-full border border-primary/20 fldr-ring-expand" 
                  style={{ animationDelay: '0.3s' }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="w-32 h-32 rounded-full border border-accent/10 fldr-ring-expand" 
                  style={{ animationDelay: '0.6s' }}
                />
              </div>
            </>
          )}
        </div>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Logo with ripple animation */}
          <div 
            className={cn(
              "relative mb-8",
              animationPhase >= 3 ? "fldr-logo-ripple" : "opacity-0"
            )}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 -m-8 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-full blur-3xl fldr-glow-pulse" />
            
            {/* Logo */}
            <img 
              src={fldrLogo} 
              alt="fldr" 
              className="relative h-28 w-auto dark:invert"
            />
          </div>
          
          {/* Loading text */}
          <div 
            className={cn(
              "text-sm text-muted-foreground transition-opacity duration-500",
              animationPhase >= 3 ? "opacity-100" : "opacity-0"
            )}
          >
            {animationPhase < 4 ? 'Entering creative space...' : 'Almost ready...'}
          </div>
          
          {/* Progress bar */}
          <div className="mt-6 w-48 h-0.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary via-accent to-primary fldr-progress-bar" />
          </div>
        </div>
        
        {/* Phase indicator (debug - can be removed) */}
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground/50">
          {dataReady ? 'Data loaded' : 'Loading data...'}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "min-h-screen bg-background",
        portalPhase === 'exiting' && "fldr-portal-exit"
      )}
    >
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
          "fldr-content-reveal",
          portalPhase === 'ready' && "opacity-100"
        )}
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
