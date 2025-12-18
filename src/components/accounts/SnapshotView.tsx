import { Card } from '@/components/ui/card';
import { useYearlySnapshot } from '@/hooks/useYearlySnapshot';
import { Trophy, TrendingUp, TrendingDown, Calendar, DollarSign, Package, Repeat, Sparkles, Target, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SnapshotViewProps {
  brandId: string;
}

export function SnapshotView({ brandId }: SnapshotViewProps) {
  const { data, loading, error } = useYearlySnapshot(brandId);
  const currentYear = new Date().getFullYear();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  if (!data || data.totalOrders === 0) {
    return (
      <Card className="p-12 text-center">
        <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
        <p className="text-muted-foreground">
          Complete some orders this year to see your snapshot.
        </p>
      </Card>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const cards = [
    {
      title: 'Your Top Vendor',
      subtitle: `${currentYear} Revenue Champion`,
      icon: Trophy,
      value: data.topVendor?.name || 'N/A',
      detail: data.topVendor ? formatCurrency(data.topVendor.revenue) : '',
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Best Month',
      subtitle: 'Peak Performance',
      icon: TrendingUp,
      value: data.bestMonth?.month || 'N/A',
      detail: data.bestMonth ? formatCurrency(data.bestMonth.revenue) : '',
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500',
    },
    {
      title: 'Total Revenue',
      subtitle: `${currentYear} Earnings`,
      icon: DollarSign,
      value: formatCurrency(data.totalRevenue),
      detail: `${data.totalOrders.toLocaleString()} orders`,
      gradient: 'from-blue-500/20 to-indigo-500/20',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Most Reliable',
      subtitle: 'Consistency Award',
      icon: Repeat,
      value: data.mostConsistentVendor?.name || 'N/A',
      detail: data.mostConsistentVendor ? `Active ${data.mostConsistentVendor.months} months` : '',
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Average Order',
      subtitle: 'Per Transaction',
      icon: Target,
      value: formatCurrency(data.avgOrderValue),
      detail: 'Per order average',
      gradient: 'from-cyan-500/20 to-teal-500/20',
      iconColor: 'text-cyan-500',
    },
    {
      title: 'Peak Day',
      subtitle: 'Busiest Day',
      icon: Zap,
      value: data.peakDay ? new Date(data.peakDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
      detail: data.peakDay ? `${data.peakDay.orders} orders` : '',
      gradient: 'from-rose-500/20 to-red-500/20',
      iconColor: 'text-rose-500',
    },
  ];

  // Add YoY growth if available
  if (data.yearOverYearGrowth !== null) {
    cards.splice(2, 0, {
      title: 'Year-over-Year',
      subtitle: 'Growth vs Last Year',
      icon: data.yearOverYearGrowth >= 0 ? TrendingUp : TrendingDown,
      value: `${data.yearOverYearGrowth >= 0 ? '+' : ''}${data.yearOverYearGrowth.toFixed(1)}%`,
      detail: data.yearOverYearGrowth >= 0 ? 'You\'re growing!' : 'Room to improve',
      gradient: data.yearOverYearGrowth >= 0 ? 'from-green-500/20 to-emerald-500/20' : 'from-red-500/20 to-orange-500/20',
      iconColor: data.yearOverYearGrowth >= 0 ? 'text-green-500' : 'text-red-500',
    });
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">{currentYear} Year in Review</span>
        </div>
        <h2 className="text-4xl font-display font-bold mb-2">Your Business Snapshot</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          A look back at your achievements and top performers this year
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card 
              key={card.title}
              className={cn(
                "relative overflow-hidden p-6 transition-all duration-300 hover:scale-[1.02]",
                "bg-gradient-to-br",
                card.gradient
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {card.subtitle}
                  </p>
                  <h3 className="text-sm font-semibold mt-1">{card.title}</h3>
                </div>
                <div className={cn("p-2 rounded-xl bg-background/50", card.iconColor)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                {card.detail && (
                  <p className="text-sm text-muted-foreground mt-1">{card.detail}</p>
                )}
              </div>

              {/* Decorative element */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-background/20 blur-xl" />
            </Card>
          );
        })}
      </div>

      {/* Lowest Performer Section */}
      {data.lowestVendor && data.lowestVendor.name !== data.topVendor?.name && (
        <Card className="p-6 bg-muted/50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-muted">
              <TrendingDown className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Room for Growth</h3>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{data.lowestVendor.name}</span> had the lowest revenue at {formatCurrency(data.lowestVendor.revenue)}. 
                Consider reviewing this partnership.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
