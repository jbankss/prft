import { Card } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { MoreHorizontal } from 'lucide-react';

const data = [
  { month: 'Jan', value: 28 },
  { month: 'Feb', value: 32 },
  { month: 'Mar', value: 35 },
  { month: 'Apr', value: 38 },
  { month: 'May', value: 42 },
  { month: 'Jun', value: 42 },
];

export function RetentionChart() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Retention</h3>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-6">
        <div className="text-4xl font-bold mb-1">42%</div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis hide />
            <defs>
              <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(350, 89%, 60%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(350, 89%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(350, 89%, 60%)"
              strokeWidth={3}
              dot={false}
              fill="url(#retentionGradient)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
