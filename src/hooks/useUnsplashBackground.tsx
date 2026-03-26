import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnsplashImage {
  id: string;
  url: string;
  blurHash?: string;
  photographer: string;
  photographerUsername: string;
  photographerUrl: string;
  unsplashUrl: string;
  downloadLocation: string;
}

interface CachedData {
  images: UnsplashImage[];
  timePeriod: string;
  expiresAt: number;
  fetchedAt: number;
}

interface UseUnsplashBackgroundReturn {
  currentImage: UnsplashImage | null;
  nextImage: UnsplashImage | null;
  isTransitioning: boolean;
  isLoading: boolean;
  error: string | null;
}

const CACHE_KEY = 'unsplash_backgrounds_cache';
const CYCLE_INTERVAL = 300000; // 5 minutes between image swaps
const TRANSITION_DURATION = 2000; // 2 second crossfade

function getLocalHour(): number {
  return new Date().getHours();
}

function getTimePeriodName(hour: number): string {
  if (hour >= 22 || hour < 5) return 'night';
  if (hour >= 5 && hour < 6.5) return 'dawn';
  if (hour >= 6.5 && hour < 8) return 'sunrise';
  if (hour >= 8 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19.5) return 'sunset';
  return 'dusk';
}

export function useUnsplashBackground(): UseUnsplashBackgroundReturn {
  const [images, setImages] = useState<UnsplashImage[]>(() => {
    // Immediately load from cache on mount
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const cacheData: CachedData = JSON.parse(cached);
        return cacheData.images;
      } catch {
        return [];
      }
    }
    return [];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    // Not loading if we have cached images
    const cached = localStorage.getItem(CACHE_KEY);
    return !cached;
  });
  const [error, setError] = useState<string | null>(null);
  const preloadedImages = useRef<Set<string>>(new Set());
  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preload an image and return a promise
  const preloadImage = useCallback((url: string): Promise<void> => {
    if (preloadedImages.current.has(url)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        preloadedImages.current.add(url);
        resolve();
      };
      img.onerror = () => resolve(); // Don't block on errors
      img.src = url;
    });
  }, []);

  // Fetch images from edge function
  const fetchImages = useCallback(async (hour: number) => {
    try {
      console.log('Fetching Unsplash images for hour:', hour);
      
      const { data, error: fnError } = await supabase.functions.invoke('get-unsplash-backgrounds', {
        body: { hour },
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message);
      }

      if (!data?.images?.length) {
        throw new Error('No images returned');
      }

      // Cache the response
      const cacheData: CachedData = {
        images: data.images,
        timePeriod: data.timePeriod,
        expiresAt: data.expiresAt,
        fetchedAt: data.fetchedAt,
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`Cached ${data.images.length} images for period: ${data.timePeriod}`);
      
      return data.images as UnsplashImage[];
    } catch (err) {
      console.error('Failed to fetch Unsplash images:', err);
      throw err;
    }
  }, []);

  // Check cache and fetch if needed
  const loadImages = useCallback(async () => {
    const hour = getLocalHour();
    const currentPeriod = getTimePeriodName(hour);
    
    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheData: CachedData = JSON.parse(cached);
        const now = Date.now();
        
        // Use cache if valid and same time period
        if (cacheData.expiresAt > now && cacheData.timePeriod === currentPeriod) {
          console.log('Using cached images for period:', currentPeriod);
          setImages(cacheData.images);
          setIsLoading(false);
          
          // Preload first image immediately, others in background
          if (cacheData.images.length > 0) {
            await preloadImage(cacheData.images[0].url);
            cacheData.images.slice(1, 3).forEach(img => preloadImage(img.url));
          }
          return;
        }
      }

      // If we already have images from initial state, don't show loading
      // Just fetch in background
      const hasInitialImages = images.length > 0;
      if (!hasInitialImages) {
        setIsLoading(true);
      }
      
      const freshImages = await fetchImages(hour);
      setImages(freshImages);
      setError(null);
      
      // Preload first image, then others
      if (freshImages.length > 0) {
        await preloadImage(freshImages[0].url);
        freshImages.slice(1, 3).forEach(img => preloadImage(img.url));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backgrounds');
      
      // Try to use stale cache as fallback
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheData: CachedData = JSON.parse(cached);
        setImages(cacheData.images);
        console.log('Using stale cache as fallback');
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchImages, preloadImage, images.length]);

  // Initial load
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Check for time period changes every minute
  useEffect(() => {
    const checkPeriod = setInterval(() => {
      const hour = getLocalHour();
      const currentPeriod = getTimePeriodName(hour);
      
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheData: CachedData = JSON.parse(cached);
        if (cacheData.timePeriod !== currentPeriod) {
          console.log('Time period changed, fetching new images');
          loadImages();
        }
      }
    }, 60000);

    return () => clearInterval(checkPeriod);
  }, [loadImages]);

  // Cycle through images
  useEffect(() => {
    if (images.length <= 1) return;

    cycleIntervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentIndex(prev => {
          const nextIdx = (prev + 1) % images.length;
          // Preload the image after next
          const preloadIdx = (nextIdx + 1) % images.length;
          preloadImage(images[preloadIdx].url);
          return nextIdx;
        });
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, TRANSITION_DURATION);
      }, 100);
    }, CYCLE_INTERVAL);

    return () => {
      if (cycleIntervalRef.current) {
        clearInterval(cycleIntervalRef.current);
      }
    };
  }, [images, preloadImage]);

  const currentImage = images[currentIndex] || null;
  const nextImage = images[(currentIndex + 1) % images.length] || null;

  return {
    currentImage,
    nextImage,
    isTransitioning,
    isLoading,
    error,
  };
}
