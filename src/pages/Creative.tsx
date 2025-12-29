import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FolderOpen, Upload, BarChart3, HardDrive, LayoutGrid, Image } from 'lucide-react';
import { AssetList } from '@/components/creative/AssetList';
import { CollectionsView } from '@/components/creative/CollectionsView';
import { CreativeSidebar } from '@/components/creative/CreativeSidebar';
import { CreativeWidgets } from '@/components/creative/CreativeWidgets';
import { IntegratedUpload } from '@/components/creative/IntegratedUpload';
import { BulkActions } from '@/components/creative/BulkActions';
import { EnhancedAssetLightbox } from '@/components/creative/EnhancedAssetLightbox';
import { StorageView } from '@/components/creative/StorageView';
import { AnalyticsView } from '@/components/creative/AnalyticsView';
import { ActivityFeed } from '@/components/creative/ActivityFeed';
import { toast } from 'sonner';

export default function Creative() {
  const isMobile = useIsMobile();
  const {
    currentBrand
  } = useBrandContext();
  const [assets, setAssets] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'assets' | 'upload' | 'collections' | 'analytics' | 'storage'>('overview');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const fetchAssets = async () => {
    if (!currentBrand) return;
    try {
      let query = supabase.from('creative_assets').select('*, profiles(full_name)').eq('brand_id', currentBrand.id).order('created_at', {
        ascending: false
      });
      if (category !== 'all') {
        query = query.eq('category', category);
      }
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };
  const fetchCollections = async () => {
    if (!currentBrand) return;
    try {
      const {
        data,
        error
      } = await supabase.from('asset_collections').select('*').eq('brand_id', currentBrand.id).order('created_at', {
        ascending: false
      });
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
      fetchAssets();
      fetchCollections();
      fetchPendingApprovals();
      const channel = supabase.channel('creative-assets-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'creative_assets'
      }, fetchAssets).on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'asset_collections'
      }, fetchCollections).on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'upload_sessions'
      }, fetchPendingApprovals).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentBrand, category, status]);
  const filteredAssets = assets.filter(asset => {
    if (!searchQuery) return true;
    return asset.file_name.toLowerCase().includes(searchQuery.toLowerCase()) || asset.title?.toLowerCase().includes(searchQuery.toLowerCase()) || asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) || asset.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
  });
  const toggleSelectAsset = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]);
  };

  // Calculate stats for widgets
  const totalStorage = 10 * 1024 * 1024 * 1024; // 10 GB total
  const usedStorage = assets.reduce((sum, asset) => sum + asset.file_size, 0);
  const recentCount = assets.filter(asset => new Date(asset.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  if (loading) {
    return <div className="flex h-screen">
        {/* Desktop sidebar */}
        {!isMobile && <CreativeSidebar activeView={activeView} onViewChange={setActiveView} />}
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>;
  }

  return <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Desktop: Show sidebar */}
      {!isMobile && <CreativeSidebar activeView={activeView} onViewChange={setActiveView} />}
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 lg:p-12 space-y-6 md:space-y-8">
          {/* Mobile: Tab navigation */}
          {isMobile && (
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)} className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="flex flex-col gap-1 py-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-[10px]">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex flex-col gap-1 py-2">
                  <Image className="h-4 w-4" />
                  <span className="text-[10px]">Assets</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex flex-col gap-1 py-2">
                  <Upload className="h-4 w-4" />
                  <span className="text-[10px]">Upload</span>
                </TabsTrigger>
                <TabsTrigger value="collections" className="flex flex-col gap-1 py-2">
                  <FolderOpen className="h-4 w-4" />
                  <span className="text-[10px]">Collections</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-display font-semibold mb-2">
                {activeView === 'overview' && 'Creative Studio'}
                {activeView === 'assets' && 'Assets'}
                {activeView === 'upload' && 'Upload'}
                {activeView === 'collections' && 'Collections'}
                {activeView === 'analytics' && 'Analytics'}
                {activeView === 'storage' && 'Storage'}
              </h1>
              
            </div>
          </div>

          {/* Overview */}
          {activeView === 'overview' && <div className="space-y-6 md:space-y-8">
              <CreativeWidgets totalAssets={assets.length} storageUsed={usedStorage} storageTotal={totalStorage} recentCount={recentCount} pendingApprovals={pendingApprovals} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl md:text-2xl font-display font-semibold">Recent Assets</h2>
                    <button onClick={() => setActiveView('assets')} className="text-sm text-primary hover:underline font-medium">
                      See all →
                    </button>
                  </div>
                  <AssetList assets={assets.slice(0, 5)} onRefresh={fetchAssets} selectedIds={[]} />
                </div>

                <div className="space-y-4 md:space-y-6">
                  <h2 className="text-xl md:text-2xl font-display font-semibold">Quick Actions</h2>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <button onClick={() => setActiveView('upload')} className="p-4 md:p-8 bg-card border border-border rounded-2xl md:rounded-3xl hover:bg-muted/50 transition-colors text-left">
                      <Search className="h-8 w-8 md:h-10 md:w-10 mb-3 md:mb-4 text-primary" />
                      <h3 className="font-semibold mb-1 text-base md:text-lg">Upload Files</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">Add new assets</p>
                    </button>
                    <button onClick={() => setActiveView('collections')} className="p-4 md:p-8 bg-card border border-border rounded-2xl md:rounded-3xl hover:bg-muted/50 transition-colors text-left">
                      <FolderOpen className="h-8 w-8 md:h-10 md:w-10 mb-3 md:mb-4 text-primary" />
                      <h3 className="font-semibold mb-1 text-base md:text-lg">Collections</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">Organize assets</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <ActivityFeed />
                </div>
              </div>
            </div>}

          {/* Assets View */}
          {activeView === 'assets' && <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search assets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="photography">Photography</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="logo">Logos</SelectItem>
                    <SelectItem value="rules">Design Rules</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="deployed">Deployed</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredAssets.length === 0 ? <div className="text-center py-8 md:py-12 bg-card rounded-xl border border-border">
                  <FolderOpen className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4 text-sm md:text-base">
                    {searchQuery ? 'No assets found matching your search' : 'No assets yet. Upload your first asset to get started.'}
                  </p>
                </div> : <AssetList assets={filteredAssets} onRefresh={fetchAssets} selectedIds={selectedIds} onToggleSelect={toggleSelectAsset} />}
            </div>}

          <BulkActions selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} onRefresh={fetchAssets} collections={collections} />

          {/* Upload View */}
          {activeView === 'upload' && <IntegratedUpload onSuccess={fetchAssets} />}

          {/* Collections View */}
          {activeView === 'collections' && <CollectionsView onRefresh={fetchAssets} />}

          {/* Analytics View */}
          {activeView === 'analytics' && <AnalyticsView />}

          {/* Storage View */}
          {activeView === 'storage' && <StorageView />}
        </div>
      </main>
    </div>;
}