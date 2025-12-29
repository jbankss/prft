import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnsplashImage {
  url: string;
  photographerName: string;
  photographerUrl: string;
  unsplashUrl: string;
}

interface UseFldrUnsplashBackgroundReturn {
  currentImage: UnsplashImage | null;
  nextImage: UnsplashImage | null;
  isTransitioning: boolean;
  isLoading: boolean;
  error: string | null;
}

const CACHE_KEY = 'fldr_unsplash_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Creative/design themed queries based on time
function getFldrQuery(hour: number): string {
  if (hour >= 5 && hour < 9) {
    return 'creative workspace morning light';
  } else if (hour >= 9 && hour < 12) {
    return 'minimal design studio';
  } else if (hour >= 12 && hour < 17) {
    return 'creative photography abstract';
  } else if (hour >= 17 && hour < 21) {
    return 'sunset creative photography';
  } else {
    return 'night creative neon design';
  }
}

interface CachedData {
  images: UnsplashImage[];
  query: string;
  expiresAt: number;
}

export function useFldrUnsplashBackground(): UseFldrUnsplashBackgroundReturn {
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const preloadImage = useCallback(async (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  const fetchImages = useCallback(async (query: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-unsplash-backgrounds', {
        body: { query, count: 5 }
      });

      if (fnError) throw fnError;

      if (data?.images && Array.isArray(data.images)) {
        return data.images as UnsplashImage[];
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch Unsplash images:', err);
      return [];
    }
  }, []);

  const loadImages = useCallback(async () => {
    const hour = new Date().getHours();
    const query = getFldrQuery(hour);

    // Check cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CachedData = JSON.parse(cached);
        if (data.expiresAt > Date.now() && data.query === query && data.images.length > 0) {
          setImages(data.images);
          setIsLoading(false);
          // Preload first image
          if (data.images[0]) {
            preloadImage(data.images[0].url).catch(() => {});
          }
          return;
        }
      }
    } catch {
      // Cache read failed, continue to fetch
    }

    // Fetch fresh images
    setIsLoading(true);
    const fetchedImages = await fetchImages(query);
    
    if (fetchedImages.length > 0) {
      setImages(fetchedImages);
      setError(null);
      
      // Cache the results
      try {
        const cacheData: CachedData = {
          images: fetchedImages,
          query,
          expiresAt: Date.now() + CACHE_DURATION
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      } catch {
        // Cache write failed, continue
      }
      
      // Preload first image
      if (fetchedImages[0]) {
        await preloadImage(fetchedImages[0].url).catch(() => {});
      }
    } else {
      setError('No images available');
    }
    
    setIsLoading(false);
  }, [fetchImages, preloadImage]);

  // Initial load
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Cycle through images every 30 seconds
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
        setIsTransitioning(false);
      }, 1000); // Transition duration
    }, 30000); // Cycle every 30 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  // Preload next image
  useEffect(() => {
    if (images.length <= 1) return;
    
    const nextIndex = (currentIndex + 1) % images.length;
    if (images[nextIndex]) {
      preloadImage(images[nextIndex].url).catch(() => {});
    }
  }, [currentIndex, images, preloadImage]);

  const currentImage = images[currentIndex] || null;
  const nextImage = images[(currentIndex + 1) % images.length] || null;

  return {
    currentImage,
    nextImage,
    isTransitioning,
    isLoading,
    error
  };
}
