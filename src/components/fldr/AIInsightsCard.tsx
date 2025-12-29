import { useState, useEffect } from 'react';
import { Sparkles, Image, AlertCircle, Tag, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  icon: React.ReactNode;
  message: string;
  type: 'info' | 'warning' | 'success';
  action?: string;
}

export function AIInsightsCard() {
  const { currentBrand } = useBrandContext();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (currentBrand) {
      generateInsights();
    }
  }, [currentBrand]);

  // Rotate through insights
  useEffect(() => {
    if (insights.length <= 1) return;

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % insights.length);
        setIsVisible(true);
      }, 300);
    }, 6000);

    return () => clearInterval(interval);
  }, [insights.length]);

  const generateInsights = async () => {
    if (!currentBrand) return;

    try {
      const generatedInsights: Insight[] = [];

      // Check for assets without tags
      const { data: untaggedAssets } = await supabase
        .from('creative_assets')
        .select('id')
        .eq('brand_id', currentBrand.id)
        .or('tags.is.null,tags.eq.{}');

      if (untaggedAssets && untaggedAssets.length > 0) {
        generatedInsights.push({
          id: 'untagged',
          icon: <Tag className="h-4 w-4" />,
          message: `${untaggedAssets.length} assets are missing tags. Add tags to improve searchability.`,
          type: 'warning',
          action: 'Add Tags',
        });
      }

      // Check for old unused assets (6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: oldAssets } = await supabase
        .from('creative_assets')
        .select('id')
        .eq('brand_id', currentBrand.id)
        .lt('updated_at', sixMonthsAgo.toISOString());

      if (oldAssets && oldAssets.length > 0) {
        generatedInsights.push({
          id: 'old-assets',
          icon: <Clock className="h-4 w-4" />,
          message: `${oldAssets.length} assets haven't been updated in 6+ months. Consider archiving unused assets.`,
          type: 'info',
          action: 'Review',
        });
      }

      // Get category breakdown
      const { data: assets } = await supabase
        .from('creative_assets')
        .select('category')
        .eq('brand_id', currentBrand.id);

      if (assets && assets.length > 0) {
        const categories: { [key: string]: number } = {};
        assets.forEach((a) => {
          categories[a.category] = (categories[a.category] || 0) + 1;
        });

        const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
          const percentage = Math.round((topCategory[1] / assets.length) * 100);
          generatedInsights.push({
            id: 'category-insight',
            icon: <TrendingUp className="h-4 w-4" />,
            message: `Your most popular category is ${topCategory[0]} (${percentage}% of all assets).`,
            type: 'success',
          });
        }

        // Total assets count insight
        generatedInsights.push({
          id: 'total-assets',
          icon: <Image className="h-4 w-4" />,
          message: `You have ${assets.length} assets across ${Object.keys(categories).length} categories.`,
          type: 'info',
        });
      }

      // Check for pending approvals
      const { count: pendingCount } = await supabase
        .from('creative_assets')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id)
        .eq('status', 'pending');

      if (pendingCount && pendingCount > 0) {
        generatedInsights.push({
          id: 'pending',
          icon: <AlertCircle className="h-4 w-4" />,
          message: `${pendingCount} assets are awaiting approval. Review them to keep the workflow moving.`,
          type: 'warning',
          action: 'Review',
        });
      }

      setInsights(generatedInsights.length > 0 ? generatedInsights : [{
        id: 'default',
        icon: <Sparkles className="h-4 w-4" />,
        message: 'Your asset library is well organized! Keep up the great work.',
        type: 'success',
      }]);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setInsights([{
        id: 'error',
        icon: <Sparkles className="h-4 w-4" />,
        message: 'AI insights will appear here as you add more assets.',
        type: 'info',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const currentInsight = insights[currentIndex];

  const typeStyles = {
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <h3 className="font-semibold">AI Insights</h3>
        </div>
        <div className="h-16 bg-muted animate-pulse rounded-xl" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">AI Insights</h3>
          <p className="text-xs text-muted-foreground">
            Smart suggestions for your library
          </p>
        </div>
        {insights.length > 1 && (
          <div className="flex gap-1">
            {insights.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {currentInsight && (
        <div
          className={cn(
            "p-4 rounded-xl border transition-all duration-300",
            typeStyles[currentInsight.type],
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{currentInsight.icon}</div>
            <p className="text-sm flex-1">{currentInsight.message}</p>
          </div>
          {currentInsight.action && (
            <button className="mt-3 text-xs font-medium hover:underline">
              {currentInsight.action} →
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
