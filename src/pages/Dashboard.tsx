import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { RevenueOverview } from '@/components/dashboard/RevenueOverview';
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart';
import { TopVendorsLeaderboard } from '@/components/dashboard/TopVendorsLeaderboard';
import { SalesChannelBreakdown } from '@/components/dashboard/SalesChannelBreakdown';
import { RecentOrdersFeed } from '@/components/dashboard/RecentOrdersFeed';
import { QuickStatsRow } from '@/components/dashboard/QuickStatsRow';
import { Skeleton } from '@/components/ui/skeleton';
export default function Dashboard() {
  const {
    metrics,
    loading
  } = useDashboardMetrics();
  if (loading || !metrics) {
    return <div className="space-y-6 max-w-[1600px]">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>;
  }
  return <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">Welcome.</h1>
          
        </div>
        <DateRangePicker />
      </div>

      {/* Quick Stats Row */}
      <QuickStatsRow ordersToday={metrics.ordersToday} activeVendors={metrics.activeVendors} avgOrderValue={metrics.avgOrderValue} pendingPayments={metrics.pendingPayments} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Revenue Chart */}
        <div className="lg:col-span-2">
          <RevenueTrendChart data={metrics.dailyRevenue} />
        </div>

        {/* Right Column - Revenue Overview */}
        <div>
          <RevenueOverview todayRevenue={metrics.todayRevenue} yesterdayRevenue={metrics.yesterdayRevenue} weekRevenue={metrics.weekRevenue} monthRevenue={metrics.monthRevenue} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TopVendorsLeaderboard vendors={metrics.topVendors} />
        <SalesChannelBreakdown pos={metrics.salesChannels.pos} online={metrics.salesChannels.online} />
        <RecentOrdersFeed orders={metrics.recentOrders} />
      </div>
    </div>;
}