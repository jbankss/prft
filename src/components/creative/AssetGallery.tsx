import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, Video, FileText, Download } from 'lucide-react';
import { AssetDetailsDialog } from './AssetDetailsDialog';

interface Asset {
  id: string;
  file_name: string;
  file_path: string;
  bucket: string;
  mime_type: string;
  file_size: number;
  status: string;
  category: string;
  title?: string;
  tags?: string[];
  created_at: string;
}

export function AssetGallery({
  assets,
  onRefresh,
}: {
  assets: Asset[];
  onRefresh: () => void;
}) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const getAssetUrl = (asset: Asset) => {
    const { data } = supabase.storage.from(asset.bucket).getPublicUrl(asset.file_path);
    return data.publicUrl;
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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    return FileText;
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {assets.map((asset) => {
          const Icon = getFileIcon(asset.mime_type);
          const isImage = asset.mime_type.startsWith('image/');

          return (
            <Card
              key={asset.id}
              className="group overflow-hidden cursor-pointer hover:shadow-apple-lg transition-all duration-200 hover:scale-[1.02]"
              onClick={() => setSelectedAsset(asset)}
            >
              <div className="aspect-square relative bg-muted">
                {isImage ? (
                  <img
                    src={getAssetUrl(asset)}
                    alt={asset.title || asset.file_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge className={`${getStatusColor(asset.status)} capitalize text-xs`}>
                    {asset.status}
                  </Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm truncate mb-1">
                  {asset.title || asset.file_name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {asset.category}
                </p>
                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asset.tags.slice(0, 2).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {asset.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{asset.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
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