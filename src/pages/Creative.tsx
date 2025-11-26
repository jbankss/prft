import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Search, Grid3x3, List, FolderOpen } from 'lucide-react';
import { AssetUploadDialog } from '@/components/creative/AssetUploadDialog';
import { AssetGallery } from '@/components/creative/AssetGallery';
import { AssetList } from '@/components/creative/AssetList';
import { CollectionsView } from '@/components/creative/CollectionsView';
import { toast } from 'sonner';

export default function Creative() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAssets = async () => {
    try {
      let query = supabase
        .from('creative_assets')
        .select('*, profiles(full_name)')
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
    fetchAssets();

    const channel = supabase
      .channel('creative-assets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creative_assets' }, fetchAssets)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [category, status]);

  const filteredAssets = assets.filter(asset => {
    if (!searchQuery) return true;
    return (
      asset.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

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
          <h1 className="text-3xl font-semibold mb-2">Photography & Creative</h1>
          <p className="text-muted-foreground">Manage your creative assets with full quality storage</p>
        </div>
        <Button
          onClick={() => setShowUpload(true)}
          className="transition-all duration-200 hover:scale-105"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Assets
        </Button>
      </div>

      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
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

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="text-center py-12 glass rounded-lg">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No assets found matching your search' : 'No assets yet. Upload your first asset to get started.'}
              </p>
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Assets
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <AssetGallery assets={filteredAssets} onRefresh={fetchAssets} />
          ) : (
            <AssetList assets={filteredAssets} onRefresh={fetchAssets} />
          )}
        </TabsContent>

        <TabsContent value="collections">
          <CollectionsView onRefresh={fetchAssets} />
        </TabsContent>
      </Tabs>

      <AssetUploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        onSuccess={fetchAssets}
      />
    </div>
  );
}