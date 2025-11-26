import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AssetDetailsDialog } from './AssetDetailsDialog';

export function AssetList({ assets, onRefresh }: { assets: any[]; onRefresh: () => void }) {
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const getAssetUrl = (asset: any) => {
    const { data } = supabase.storage.from(asset.bucket).getPublicUrl(asset.file_path);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'deployed':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'submitted':
        return 'bg-purple-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <>
      <div className="space-y-2">
        {assets.map((asset) => (
          <Card
            key={asset.id}
            className="p-4 hover:shadow-apple-md transition-all duration-200 cursor-pointer"
            onClick={() => setSelectedAsset(asset)}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded bg-muted flex-shrink-0 overflow-hidden">
                {asset.mime_type.startsWith('image/') ? (
                  <img
                    src={getAssetUrl(asset)}
                    alt={asset.title || asset.file_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {asset.file_type.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">
                    {asset.title || asset.file_name}
                  </p>
                  <Badge className={`${getStatusColor(asset.status)} capitalize`}>
                    {asset.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="capitalize">{asset.category}</span>
                  <span>{formatFileSize(asset.file_size)}</span>
                  {asset.width && asset.height && (
                    <span>{asset.width} × {asset.height}</span>
                  )}
                  <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                </div>
                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asset.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(getAssetUrl(asset), '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedAsset && (
        <AssetDetailsDialog
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}