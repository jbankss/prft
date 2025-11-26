import { Card } from '@/components/ui/card';
import { MoreHorizontal } from 'lucide-react';

const data = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: Math.floor(Math.random() * 5000) + 2000,
}));

export function TransactionsCard() {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const peak = Math.max(...data.map(d => d.value));
  const peakDay = data.find(d => d.value === peak)?.day;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Transactions</h3>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <div className="text-4xl font-bold mb-1">{(total / 1000).toFixed(0)}k</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Peak:</span>
          <span className="text-sm font-medium">Wed</span>
        </div>
      </div>

      {/* Dot chart */}
      <div className="flex items-end gap-1 h-32">
        {data.map((item) => {
          const height = (item.value / peak) * 100;
          const isHighest = item.value === peak;
          return (
            <div
              key={item.day}
              className="flex-1 flex flex-col justify-end"
            >
              <div
                className="w-full rounded-full transition-all"
                style={{
                  height: `${height}%`,
                  backgroundColor: isHighest ? 'hsl(142, 71%, 45%)' : 'hsl(142, 71%, 85%)',
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">vs last period</span>
          <span className="font-medium text-green-600">+34,002</span>
        </div>
      </div>
    </Card>
  );
}
