import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from './useBrandContext';
import { startOfDay, startOfWeek, subWeeks } from 'date-fns';

interface FldrMetrics {
  totalAssets: number;
  todayUploads: number;
  weekUploads: number;
  lastWeekUploads: number;
  totalStorage: number;
  pendingApprovals: number;
  totalCollections: number;
  topCategory: string | null;
}

interface FunFact {
  emoji: string;
  text: string;
}

export function useFldrMetrics() {
  const { currentBrand } = useBrandContext();
  const [metrics, setMetrics] = useState<FldrMetrics>({
    totalAssets: 0,
    todayUploads: 0,
    weekUploads: 0,
    lastWeekUploads: 0,
    totalStorage: 0,
    pendingApprovals: 0,
    totalCollections: 0,
    topCategory: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBrand?.id) return;

    const fetchMetrics = async () => {
      const today = startOfDay(new Date());
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const lastWeekStart = subWeeks(weekStart, 1);

      // Total assets
      const { count: totalAssets } = await supabase
        .from('creative_assets')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id);

      // Today's uploads
      const { count: todayUploads } = await supabase
        .from('creative_assets')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id)
        .gte('created_at', today.toISOString());

      // This week's uploads
      const { count: weekUploads } = await supabase
        .from('creative_assets')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id)
        .gte('created_at', weekStart.toISOString());

      // Last week's uploads
      const { count: lastWeekUploads } = await supabase
        .from('creative_assets')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id)
        .gte('created_at', lastWeekStart.toISOString())
        .lt('created_at', weekStart.toISOString());

      // Total storage
      const { data: storageData } = await supabase
        .from('creative_assets')
        .select('file_size')
        .eq('brand_id', currentBrand.id);

      const totalStorage = storageData?.reduce((sum, a) => sum + (a.file_size || 0), 0) || 0;

      // Pending approvals
      const { count: pendingApprovals } = await supabase
        .from('upload_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id)
        .eq('status', 'pending_approval');

      // Total collections
      const { count: totalCollections } = await supabase
        .from('asset_collections')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id);

      // Top category
      const { data: categoryData } = await supabase
        .from('creative_assets')
        .select('category')
        .eq('brand_id', currentBrand.id);

      const categoryCounts: Record<string, number> = {};
      categoryData?.forEach(a => {
        if (a.category) {
          categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
        }
      });
      const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      setMetrics({
        totalAssets: totalAssets || 0,
        todayUploads: todayUploads || 0,
        weekUploads: weekUploads || 0,
        lastWeekUploads: lastWeekUploads || 0,
        totalStorage,
        pendingApprovals: pendingApprovals || 0,
        totalCollections: totalCollections || 0,
        topCategory,
      });
      setLoading(false);
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);

    return () => clearInterval(interval);
  }, [currentBrand?.id]);

  // Generate fun facts for fldr
  const generateFunFacts = (): FunFact[] => {
    const facts: FunFact[] = [];

    if (metrics.totalAssets > 0) {
      facts.push({
        emoji: '📁',
        text: `${metrics.totalAssets.toLocaleString()} total assets in your library`,
      });
    }

    if (metrics.todayUploads > 0) {
      facts.push({
        emoji: '📤',
        text: `${metrics.todayUploads} upload${metrics.todayUploads !== 1 ? 's' : ''} today`,
      });
    }

    if (metrics.weekUploads > 0) {
      facts.push({
        emoji: '📅',
        text: `${metrics.weekUploads} new assets this week`,
      });
    }

    if (metrics.lastWeekUploads > 0 && metrics.weekUploads > 0) {
      const change = ((metrics.weekUploads - metrics.lastWeekUploads) / metrics.lastWeekUploads) * 100;
      if (change > 0) {
        facts.push({
          emoji: '🚀',
          text: `Uploads up ${change.toFixed(0)}% vs last week`,
        });
      } else if (change < 0) {
        facts.push({
          emoji: '📉',
          text: `Uploads down ${Math.abs(change).toFixed(0)}% vs last week`,
        });
      }
    }

    if (metrics.totalStorage > 0) {
      const sizeInMB = metrics.totalStorage / (1024 * 1024);
      const sizeInGB = sizeInMB / 1024;
      const displaySize = sizeInGB >= 1 
        ? `${sizeInGB.toFixed(1)} GB` 
        : `${sizeInMB.toFixed(0)} MB`;
      facts.push({
        emoji: '💾',
        text: `${displaySize} of creative assets stored`,
      });
    }

    if (metrics.pendingApprovals > 0) {
      facts.push({
        emoji: '⏳',
        text: `${metrics.pendingApprovals} upload${metrics.pendingApprovals !== 1 ? 's' : ''} awaiting approval`,
      });
    }

    if (metrics.totalCollections > 0) {
      facts.push({
        emoji: '📂',
        text: `${metrics.totalCollections} collection${metrics.totalCollections !== 1 ? 's' : ''} organized`,
      });
    }

    if (metrics.topCategory) {
      facts.push({
        emoji: '🏷️',
        text: `Most assets in: ${metrics.topCategory}`,
      });
    }

    // Fallback
    if (facts.length < 2) {
      facts.push({
        emoji: '✨',
        text: 'Ready to upload your creative assets',
      });
    }

    return facts;
  };

  return {
    metrics,
    loading,
    funFacts: generateFunFacts(),
  };
}
