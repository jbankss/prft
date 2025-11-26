import { Link } from 'lucide-react';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { MetricBarChart } from '@/components/dashboard/MetricBarChart';
import { GrossVolumeCard } from '@/components/dashboard/GrossVolumeCard';
import { RetentionChart } from '@/components/dashboard/RetentionChart';
import { TransactionsCard } from '@/components/dashboard/TransactionsCard';
import { InsightsCard } from '@/components/dashboard/InsightsCard';

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">Overview</h1>
          <button className="p-2 hover:bg-accent rounded-lg transition-colors">
            <Link className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <DateRangePicker />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Payments Chart */}
        <div className="lg:col-span-2">
          <MetricBarChart />
        </div>

        {/* Right Column - Gross Volume */}
        <div>
          <GrossVolumeCard />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RetentionChart />
        <TransactionsCard />
        <InsightsCard />
      </div>
    </div>
  );
}