import { useState } from 'react';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { useDashboardMetrics, DateRangeState } from '@/hooks/useDashboardMetrics';
import { RevenueOverview } from '@/components/dashboard/RevenueOverview';
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart';
import { TopVendorsLeaderboard } from '@/components/dashboard/TopVendorsLeaderboard';
import { SalesChannelBreakdown } from '@/components/dashboard/SalesChannelBreakdown';
import { RecentOrdersFeed } from '@/components/dashboard/RecentOrdersFeed';
import { QuickStatsRow } from '@/components/dashboard/QuickStatsRow';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays } from 'date-fns';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRangeState>({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const { metrics, loading } = useDashboardMetrics(dateRange);

  if (loading || !metrics) {
    return (
      <div className="space-y-6 max-w-[1600px]">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // Extract first name from full name
  const firstName = metrics.userName?.split(' ')[0] || null;

  // Calculate title for chart based on date range
  const daysDiff = Math.round(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const chartTitle = daysDiff <= 1 
    ? 'Revenue Today' 
    : `Revenue Trend (Last ${daysDiff + 1} Days)`;

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display font-semibold text-2xl md:text-4xl">
            {firstName ? `Welcome, ${firstName}` : 'Welcome'}
          </h1>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Quick Stats Row */}
      <QuickStatsRow
        ordersToday={metrics.ordersToday}
        activeVendors={metrics.activeVendors}
        avgOrderValue={metrics.avgOrderValue}
        pendingPayments={metrics.pendingPayments}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Revenue Chart */}
        <div className="lg:col-span-2">
          <RevenueTrendChart
            data={metrics.dailyRevenue}
            comparisonData={metrics.comparisonDailyRevenue}
            title={chartTitle}
          />
        </div>

        {/* Right Column - Revenue Overview */}
        <div>
          <RevenueOverview
            todayRevenue={metrics.todayRevenue}
            yesterdayRevenue={metrics.yesterdayRevenue}
            weekRevenue={metrics.weekRevenue}
            monthRevenue={metrics.monthRevenue}
          />
        </div>
      </div>

      {/* Bottom Grid - Equal height cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        style={{ gridAutoRows: '1fr' }}
      >
        <div className="min-h-[320px] md:min-h-[480px]">
          <TopVendorsLeaderboard vendors={metrics.topVendors} />
        </div>
        <div className="min-h-[320px] md:min-h-[480px]">
          <SalesChannelBreakdown
            pos={metrics.salesChannels.pos}
            online={metrics.salesChannels.online}
            tiktok={metrics.salesChannels.tiktok}
          />
        </div>
        <div className="min-h-[320px] md:min-h-[480px] md:col-span-2 lg:col-span-1">
          <RecentOrdersFeed orders={metrics.recentOrders} />
        </div>
      </div>
    </div>
  );
}
