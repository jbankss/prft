import { useState, useEffect, useRef } from 'react';
import { Download, Plus, Share2, Eye, MoreHorizontal, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Asset {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  bucket: string;
  title: string | null;
  description: string | null;
  category: string;
  status: string;
  tags: string[] | null;
  width: number | null;
  height: number | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
  };
}

interface AssetCardProps {
  asset: Asset;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (asset: Asset) => void;
}

// Thumbnail size options for CDN optimization
const THUMBNAIL_SIZES = {
  small: { width: 200, height: 200, quality: 60 },
  medium: { width: 400, height: 400, quality: 70 },
  large: { width: 600, height: 600, quality: 80 },
};

export function AssetCard({ asset, isSelected, onSelect, onView }: AssetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [lowResLoaded, setLowResLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading slightly before in view
        threshold: 0.1
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Get optimized thumbnail URL with Supabase transformations
  const getThumbnailUrl = (size: 'small' | 'medium' | 'large' = 'medium') => {
    const config = THUMBNAIL_SIZES[size];
    const { data } = supabase.storage
      .from(asset.bucket)
      .getPublicUrl(asset.file_path, {
        transform: {
          width: config.width,
          height: config.height,
          quality: config.quality,
          resize: 'cover'
        }
      });
    return data.publicUrl;
  };

  // Get full resolution URL for download/view
  const getFullUrl = () => {
    const { data } = supabase.storage
      .from(asset.bucket)
      .getPublicUrl(asset.file_path);
    return data.publicUrl;
  };

  const isImage = asset.file_type.startsWith('image/');
  const isVideo = asset.file_type.startsWith('video/');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  };

  const getResolutionLabel = () => {
    if (!asset.width || !asset.height) return null;
    const mp = (asset.width * asset.height) / 1000000;
    if (mp >= 8) return '4K+';
    if (mp >= 4) return 'Large';
    if (mp >= 1) return 'Medium';
    return 'Small';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'deployed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'archived':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getFullUrl();
    const link = document.createElement('a');
    link.href = url;
    link.download = asset.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        isSelected && "ring-2 ring-primary",
        isHovered && "shadow-lg scale-[1.02]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView(asset)}
    >
      {/* Selection checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(asset.id);
        }}
        className={cn(
          "absolute top-3 left-3 z-20 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
          isSelected
            ? "bg-primary border-primary text-primary-foreground"
            : "bg-background/80 border-border opacity-0 group-hover:opacity-100"
        )}
      >
        {isSelected && <Check className="h-4 w-4" />}
      </button>

      {/* Resolution badge */}
      {getResolutionLabel() && (
        <Badge
          variant="secondary"
          className="absolute top-3 right-3 z-20 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {getResolutionLabel()}
        </Badge>
      )}

      {/* Thumbnail */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        {isImage && isInView ? (
          <>
            {/* Low-res placeholder (loads fast) */}
            {!imageLoaded && (
              <div className="absolute inset-0 fldr-thumb-shimmer" />
            )}
            
            {/* Low quality placeholder - loads first */}
            {!lowResLoaded && (
              <img
                src={getThumbnailUrl('small')}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
                onLoad={() => setLowResLoaded(true)}
                loading="eager"
                decoding="async"
              />
            )}
            
            {/* High quality thumbnail */}
            <img
              src={getThumbnailUrl('medium')}
              alt={asset.title || asset.file_name}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-all duration-500",
                isHovered && "scale-110",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
              decoding="async"
            />
          </>
        ) : isVideo && isInView ? (
          <video
            src={getFullUrl()}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {!isInView ? (
              <div className="w-full h-full fldr-thumb-shimmer" />
            ) : (
              <span className="text-2xl font-bold uppercase">
                {asset.file_type.split('/')[1]?.slice(0, 4) || 'FILE'}
              </span>
            )}
          </div>
        )}

        {/* Hover overlay with actions */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-center pb-4 gap-2 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onView(asset);
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Plus className="h-4 w-4 mr-2" />
                Add to Collection
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm truncate">
          {asset.title || asset.file_name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(asset.file_size)}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[10px] h-5", getStatusColor(asset.status))}
          >
            {asset.status}
          </Badge>
        </div>

        {/* Tags preview */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {asset.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {asset.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{asset.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
