import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Image, Video, MoreVertical, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AssetDetailsDialog } from './AssetDetailsDialog';
import { PresenceIndicator } from './PresenceIndicator';
import { useAssetPresence } from '@/hooks/useAssetPresence';

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
  width?: number;
  height?: number;
}

export function AssetList({
  assets,
  onRefresh,
  selectedIds = [],
  onToggleSelect,
}: {
  assets: Asset[];
  onRefresh: () => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { viewers } = useAssetPresence();

  const getAssetUrl = (asset: Asset) => {
    const { data } = supabase.storage.from(asset.bucket).getPublicUrl(asset.file_path);
    return data.publicUrl;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-500';
      case 'deployed':
        return 'text-blue-500';
      case 'pending':
        return 'text-yellow-500';
      case 'submitted':
        return 'text-purple-500';
      case 'archived':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'approved':
        return 100;
      case 'deployed':
        return 100;
      case 'pending':
        return 45;
      case 'submitted':
        return 75;
      case 'archived':
        return 0;
      default:
        return 0;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getFileType = (mimeType: string) => {
    if (mimeType.includes('image')) return 'IMG';
    if (mimeType.includes('video')) return 'MP4';
    if (mimeType.includes('pdf')) return 'PDF';
    return 'FILE';
  };

  return (
    <>
      <div className="space-y-3">
        {assets.map((asset) => {
          const Icon = getFileIcon(asset.mime_type);
          const isImage = asset.mime_type.startsWith('image/');
          const progress = getStatusProgress(asset.status);

          const assetViewers = viewers.filter(v => v.viewing_asset_id === asset.id);
          const isSelected = selectedIds.includes(asset.id);

          return (
            <div
              key={asset.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group hover-lift ${
                isSelected 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-card/50 border-border hover:bg-card'
              }`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('.checkbox-wrapper')) return;
                setSelectedAsset(asset);
              }}
            >
              {/* Checkbox */}
              {onToggleSelect && (
                <div className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(asset.id)}
                    className="h-5 w-5"
                  />
                </div>
              )}

              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted/50">
                {isImage ? (
                  <img
                    src={getAssetUrl(asset)}
                    alt={asset.title || asset.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate mb-1">
                  {asset.title || asset.file_name}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {formatFileSize(asset.file_size)}
                  </span>
                  {asset.width && asset.height && (
                    <span>{asset.width}x{asset.height}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(asset.created_at), { addSuffix: false })}
                  </span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {getFileType(asset.mime_type)}
                  </Badge>
                </div>
              </div>

              {/* Presence & Status */}
              <div className="flex items-center gap-4">
                {assetViewers.length > 0 && (
                  <PresenceIndicator viewers={assetViewers} />
                )}
                {asset.status !== 'archived' && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="relative w-12 h-12">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                          className={getStatusColor(asset.status)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xs font-medium ${getStatusColor(asset.status)}`}>
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
