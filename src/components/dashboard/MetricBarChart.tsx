import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { 
    brand: 'Acme Fashion', 
    cleared: 8500, 
    submitted: 2100, 
    upcoming: 900,
    total: 11500
  },
  { 
    brand: 'StyleCo', 
    cleared: 7200, 
    submitted: 3400, 
    upcoming: 600,
    total: 11200
  },
  { 
    brand: 'TrendWear', 
    cleared: 5800, 
    submitted: 1800, 
    upcoming: 1200,
    total: 8800
  },
  { 
    brand: 'Urban Chic', 
    cleared: 4200, 
    submitted: 1500, 
    upcoming: 400,
    total: 6100
  },
  { 
    brand: 'Elite Designs', 
    cleared: 2700, 
    submitted: 1000, 
    upcoming: 200,
    total: 3900
  },
];

export function MetricBarChart() {

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Payments by Brand</h2>
        <span className="text-sm text-muted-foreground">Top 5 Recent Brands</span>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis 
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="brand"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-medium mb-2">{data.brand}</p>
                      <div className="space-y-1">
                        <p className="text-xs flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[hsl(142,71%,45%)]"></span>
                          Cleared: ${data.cleared.toLocaleString()}
                        </p>
                        <p className="text-xs flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[hsl(45,93%,47%)]"></span>
                          Submitted: ${data.submitted.toLocaleString()}
                        </p>
                        <p className="text-xs flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[hsl(217,91%,60%)]"></span>
                          Upcoming: ${data.upcoming.toLocaleString()}
                        </p>
                        <p className="text-xs font-medium pt-1 border-t mt-1">
                          Total: ${data.total.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                const labels: { [key: string]: string } = {
                  cleared: 'Cleared',
                  submitted: 'Submitted',
                  upcoming: 'Upcoming'
                };
                return labels[value] || value;
              }}
            />
            <Bar dataKey="cleared" stackId="a" fill="hsl(142, 71%, 45%)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="submitted" stackId="a" fill="hsl(45, 93%, 47%)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="upcoming" stackId="a" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
