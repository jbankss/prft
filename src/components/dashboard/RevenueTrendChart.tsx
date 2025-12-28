import { Card } from '@/components/ui/card';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart } from 'recharts';
import { format, parseISO } from 'date-fns';

interface RevenueTrendChartProps {
  data: { date: string; amount: number }[];
  comparisonData?: { date: string; amount: number }[];
  title?: string;
}

export function RevenueTrendChart({ data, comparisonData, title }: RevenueTrendChartProps) {
  // Detect if data is hourly (date string contains time like "HH:mm") or daily
  const isHourlyData = data.length > 0 && data[0].date.includes(':');
  
  // Merge primary and comparison data for dual display
  const chartData = data.map((d, index) => {
    let formattedDate: string;
    if (isHourlyData) {
      // Already formatted as HH:mm
      formattedDate = d.date;
    } else {
      // Parse as date and format
      formattedDate = format(parseISO(d.date), 'MMM dd');
    }
    
    return {
      date: formattedDate,
      fullDate: d.date,
      amount: d.amount,
      comparisonAmount: comparisonData?.[index]?.amount,
      comparisonDate: comparisonData?.[index]?.date 
        ? (isHourlyData ? comparisonData[index].date : format(parseISO(comparisonData[index].date), 'MMM dd'))
        : undefined,
    };
  });

  const hasComparison = comparisonData && comparisonData.length > 0;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">{title || 'Revenue Trend'}</h3>
      
      {hasComparison && (
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Current Period</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">Comparison Period</span>
          </div>
        </div>
      )}
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="comparisonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium">{data.date}</p>
                    <p className="text-lg font-bold text-primary">
                      ${Number(data.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    {data.comparisonAmount !== undefined && (
                      <>
                        <div className="border-t border-border my-2" />
                        <p className="text-sm text-muted-foreground">{data.comparisonDate}</p>
                        <p className="text-base font-semibold text-muted-foreground">
                          ${Number(data.comparisonAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </>
                    )}
                  </div>
                );
              }}
            />
            {/* Comparison area (rendered first, behind primary) */}
            {hasComparison && (
              <Area
                type="monotone"
                dataKey="comparisonAmount"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#comparisonGradient)"
              />
            )}
            {/* Primary area */}
            <Area
              type="monotone"
              dataKey="amount"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fill="url(#revenueGradient)"
              activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
