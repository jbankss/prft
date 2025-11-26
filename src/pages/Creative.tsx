import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FolderOpen } from 'lucide-react';
import { AssetGallery } from '@/components/creative/AssetGallery';
import { AssetList } from '@/components/creative/AssetList';
import { CollectionsView } from '@/components/creative/CollectionsView';
import { CreativeSidebar } from '@/components/creative/CreativeSidebar';
import { CreativeWidgets } from '@/components/creative/CreativeWidgets';
import { IntegratedUpload } from '@/components/creative/IntegratedUpload';
import { toast } from 'sonner';

export default function Creative() {
  const { currentBrand } = useBrandContext();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'assets' | 'upload' | 'collections' | 'analytics' | 'storage'>('overview');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAssets = async () => {
    if (!currentBrand) return;
    
    try {
      let query = supabase
        .from('creative_assets')
        .select('*, profiles(full_name)')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false });

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBrand) {
      fetchAssets();

      const channel = supabase
        .channel('creative-assets-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'creative_assets' }, fetchAssets)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentBrand, category, status]);

  const filteredAssets = assets.filter(asset => {
    if (!searchQuery) return true;
    return (
      asset.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Calculate stats for widgets
  const totalStorage = 10 * 1024 * 1024 * 1024; // 10 GB total
  const usedStorage = assets.reduce((sum, asset) => sum + asset.file_size, 0);
  const recentCount = assets.filter(
    (asset) => new Date(asset.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  if (loading) {
    return (
      <div className="flex h-screen">
        <CreativeSidebar activeView={activeView} onViewChange={setActiveView} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      <CreativeSidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-1">
                {activeView === 'overview' && 'Creative Studio'}
                {activeView === 'assets' && 'Assets'}
                {activeView === 'upload' && 'Upload'}
                {activeView === 'collections' && 'Collections'}
                {activeView === 'analytics' && 'Analytics'}
                {activeView === 'storage' && 'Storage'}
              </h1>
              <p className="text-muted-foreground">
                {activeView === 'overview' && `Welcome back, ${currentBrand?.name || 'User'}`}
                {activeView === 'assets' && 'Manage your creative assets'}
                {activeView === 'upload' && 'Upload new files to your library'}
                {activeView === 'collections' && 'Organize assets into collections'}
                {activeView === 'analytics' && 'View performance metrics'}
                {activeView === 'storage' && 'Manage your storage usage'}
              </p>
            </div>
          </div>

          {/* Overview */}
          {activeView === 'overview' && (
            <div className="space-y-6">
              <CreativeWidgets
                totalAssets={assets.length}
                storageUsed={usedStorage}
                storageTotal={totalStorage}
                recentCount={recentCount}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Recent Assets</h2>
                    <button 
                      onClick={() => setActiveView('assets')}
                      className="text-sm text-primary hover:underline"
                    >
                      See all →
                    </button>
                  </div>
                  <AssetList 
                    assets={assets.slice(0, 5)} 
                    onRefresh={fetchAssets} 
                  />
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Quick Actions</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveView('upload')}
                      className="p-6 bg-card border border-border rounded-xl hover:bg-accent transition-colors text-left"
                    >
                      <Search className="h-8 w-8 mb-3 text-primary" />
                      <h3 className="font-medium mb-1">Upload Files</h3>
                      <p className="text-sm text-muted-foreground">Add new assets</p>
                    </button>
                    <button
                      onClick={() => setActiveView('collections')}
                      className="p-6 bg-card border border-border rounded-xl hover:bg-accent transition-colors text-left"
                    >
                      <FolderOpen className="h-8 w-8 mb-3 text-primary" />
                      <h3 className="font-medium mb-1">Collections</h3>
                      <p className="text-sm text-muted-foreground">Organize assets</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assets View */}
          {activeView === 'assets' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
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

              {filteredAssets.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'No assets found matching your search' : 'No assets yet. Upload your first asset to get started.'}
                  </p>
                </div>
              ) : (
                <AssetList assets={filteredAssets} onRefresh={fetchAssets} />
              )}
            </div>
          )}

          {/* Upload View */}
          {activeView === 'upload' && (
            <IntegratedUpload onSuccess={fetchAssets} />
          )}

          {/* Collections View */}
          {activeView === 'collections' && (
            <CollectionsView onRefresh={fetchAssets} />
          )}

          {/* Analytics View */}
          {activeView === 'analytics' && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">Analytics coming soon</p>
            </div>
          )}

          {/* Storage View */}
          {activeView === 'storage' && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">Storage management coming soon</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}