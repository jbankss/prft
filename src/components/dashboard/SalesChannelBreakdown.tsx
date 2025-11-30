import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Store, Globe } from 'lucide-react';

interface SalesChannelBreakdownProps {
  pos: number;
  online: number;
}

export function SalesChannelBreakdown({ pos, online }: SalesChannelBreakdownProps) {
  const total = pos + online;
  const data = [
    { name: 'POS', value: pos, icon: Store },
    { name: 'Online', value: online, icon: Globe },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))'];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Sales Channels</h3>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const value = payload[0].value as number;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium">{payload[0].name}</p>
                    <p className="text-lg font-bold">
                      ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">{percentage}%</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        {data.map((item, index) => {
          const Icon = item.icon;
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          
          return (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">{percentage}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
