import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';

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
  updated_at: string;
  profiles?: {
    full_name: string | null;
  };
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
}

const CACHE_KEY_PREFIX = 'fldr_cache_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Local storage cache helpers
const getCachedData = <T,>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
};

const setCachedData = <T,>(key: string, data: T): void => {
  try {
    localStorage.setItem(
      CACHE_KEY_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Storage full or other error, fail silently
  }
};

export function useAssetCache() {
  const { currentBrand } = useBrandContext();
  const queryClient = useQueryClient();
  const [prefetchedThumbnails, setPrefetchedThumbnails] = useState<Set<string>>(new Set());

  // Fetch assets with caching
  const {
    data: assets = [],
    isLoading: assetsLoading,
    refetch: refetchAssets,
  } = useQuery({
    queryKey: ['fldr-assets', currentBrand?.id],
    queryFn: async () => {
      if (!currentBrand?.id) return [];

      // Check local cache first
      const cached = getCachedData<Asset[]>(`assets_${currentBrand.id}`);
      if (cached) {
        // Refetch in background
        fetchFreshAssets(currentBrand.id).then((fresh) => {
          if (fresh) {
            setCachedData(`assets_${currentBrand.id}`, fresh);
            queryClient.setQueryData(['fldr-assets', currentBrand.id], fresh);
          }
        });
        return cached;
      }

      const data = await fetchFreshAssets(currentBrand.id);
      if (data) {
        setCachedData(`assets_${currentBrand.id}`, data);
      }
      return data || [];
    },
    enabled: !!currentBrand?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Fetch collections
  const {
    data: collections = [],
    isLoading: collectionsLoading,
    refetch: refetchCollections,
  } = useQuery({
    queryKey: ['fldr-collections', currentBrand?.id],
    queryFn: async () => {
      if (!currentBrand?.id) return [];

      const { data, error } = await supabase
        .from('asset_collections')
        .select('id, name, description')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch collections:', error);
        return [];
      }

      return data as Collection[];
    },
    enabled: !!currentBrand?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Helper to fetch fresh assets
  const fetchFreshAssets = async (brandId: string): Promise<Asset[] | null> => {
    const { data, error } = await supabase
      .from('creative_assets')
      .select('*, profiles(full_name)')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch assets:', error);
      return null;
    }

    return data as Asset[];
  };

  // Prefetch thumbnails for visible assets
  const prefetchThumbnails = useCallback(
    (visibleAssetIds: string[]) => {
      const assetsToPrefetch = assets.filter(
        (asset) =>
          visibleAssetIds.includes(asset.id) &&
          !prefetchedThumbnails.has(asset.id) &&
          asset.file_type.startsWith('image/')
      );

      assetsToPrefetch.forEach((asset) => {
        const { data } = supabase.storage
          .from(asset.bucket)
          .getPublicUrl(asset.file_path);

        // Create an image element to trigger browser prefetch
        const img = new Image();
        img.src = data.publicUrl;

        setPrefetchedThumbnails((prev) => new Set([...prev, asset.id]));
      });
    },
    [assets, prefetchedThumbnails]
  );

  // Real-time subscription for updates
  useEffect(() => {
    if (!currentBrand?.id) return;

    const channel = supabase
      .channel('fldr-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'creative_assets',
          filter: `brand_id=eq.${currentBrand.id}`,
        },
        () => {
          // Invalidate cache and refetch
          localStorage.removeItem(CACHE_KEY_PREFIX + `assets_${currentBrand.id}`);
          refetchAssets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_collections',
          filter: `brand_id=eq.${currentBrand.id}`,
        },
        () => {
          refetchCollections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBrand?.id, refetchAssets, refetchCollections]);

  // Combined refetch function
  const refetch = useCallback(() => {
    if (currentBrand?.id) {
      localStorage.removeItem(CACHE_KEY_PREFIX + `assets_${currentBrand.id}`);
    }
    refetchAssets();
    refetchCollections();
  }, [currentBrand?.id, refetchAssets, refetchCollections]);

  // Get single asset from cache
  const getAsset = useCallback(
    (id: string): Asset | undefined => {
      return assets.find((a) => a.id === id);
    },
    [assets]
  );

  // Optimistically update an asset in the cache
  const optimisticUpdate = useCallback(
    (id: string, updates: Partial<Asset>) => {
      queryClient.setQueryData(
        ['fldr-assets', currentBrand?.id],
        (old: Asset[] | undefined) =>
          old?.map((asset) =>
            asset.id === id ? { ...asset, ...updates } : asset
          ) || []
      );
    },
    [queryClient, currentBrand?.id]
  );

  return {
    assets,
    collections,
    loading: assetsLoading || collectionsLoading,
    refetch,
    prefetchThumbnails,
    getAsset,
    optimisticUpdate,
  };
}
