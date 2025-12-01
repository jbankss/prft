import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HardDrive, Trash2, Download, File } from 'lucide-react';
import { toast } from 'sonner';

export function StorageView() {
  const { currentBrand } = useBrandContext();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'date'>('size');

  useEffect(() => {
    if (currentBrand) {
      fetchAssets();
    }
  }, [currentBrand, sortBy]);

  const fetchAssets = async () => {
    if (!currentBrand) return;

    try {
      let query = supabase
        .from('creative_assets')
        .select('*')
        .eq('brand_id', currentBrand.id);

      // Sort based on selected option
      if (sortBy === 'size') {
        query = query.order('file_size', { ascending: false });
      } else if (sortBy === 'name') {
        query = query.order('file_name', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
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

  const handleDelete = async (asset: any) => {
    if (!confirm(`Delete ${asset.file_name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from(asset.bucket)
        .remove([asset.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('creative_assets')
        .delete()
        .eq('id', asset.id);

      if (dbError) throw dbError;

      toast.success('Asset deleted');
      fetchAssets();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Calculate storage stats
  const totalStorage = 10 * 1024 * 1024 * 1024; // 10 GB
  const usedStorage = assets.reduce((sum, asset) => sum + asset.file_size, 0);
  const storagePercent = Math.round((usedStorage / totalStorage) * 100);
  const usedStorageGB = (usedStorage / (1024 * 1024 * 1024)).toFixed(2);
  const totalStorageGB = (totalStorage / (1024 * 1024 * 1024)).toFixed(0);

  // Get storage by type
  const storageByType = assets.reduce((acc: any, asset) => {
    const type = asset.mime_type.split('/')[0];
    acc[type] = (acc[type] || 0) + asset.file_size;
    return acc;
  }, {});

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>;
  }

  return (
    <div className="space-y-8">
      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-display font-semibold mb-1">Storage Usage</h3>
              <p className="text-muted-foreground">
                {usedStorageGB} GB of {totalStorageGB} GB used
              </p>
            </div>
            <HardDrive className="h-12 w-12 text-muted-foreground" />
          </div>
          <Progress value={storagePercent} className="h-3 mb-4" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{storagePercent}% Full</span>
            <span className="font-medium">{(totalStorage - usedStorage) > 0 ? formatFileSize(totalStorage - usedStorage) : '0 GB'} remaining</span>
          </div>
        </Card>

        <Card className="p-8">
          <h3 className="text-lg font-semibold mb-4">Total Files</h3>
          <p className="text-5xl font-display font-bold mb-2">{assets.length}</p>
          <p className="text-sm text-muted-foreground">Across all categories</p>
        </Card>
      </div>

      {/* Storage by Type */}
      <Card className="p-8">
        <h3 className="text-2xl font-display font-semibold mb-6">Storage by Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(storageByType).map(([type, size]: [string, any]) => (
            <div key={type} className="p-4 rounded-2xl bg-muted/50">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {type}
              </p>
              <p className="text-2xl font-bold">{formatFileSize(size)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* File List */}
      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-display font-semibold">Files</h3>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'size' ? 'default' : 'outline'}
              onClick={() => setSortBy('size')}
              size="sm"
            >
              By Size
            </Button>
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              onClick={() => setSortBy('name')}
              size="sm"
            >
              By Name
            </Button>
            <Button
              variant={sortBy === 'date' ? 'default' : 'outline'}
              onClick={() => setSortBy('date')}
              size="sm"
            >
              By Date
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <File className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{asset.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-muted-foreground">
                  {formatFileSize(asset.file_size)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(asset)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {assets.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No files found</p>
        )}
      </Card>
    </div>
  );
}