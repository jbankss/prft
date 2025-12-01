import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Store, Globe, Video } from 'lucide-react';

interface SalesChannelBreakdownProps {
  pos: number;
  online: number;
  tiktok: number;
}

export function SalesChannelBreakdown({ pos, online, tiktok }: SalesChannelBreakdownProps) {
  const total = pos + online + tiktok;
  const data = [
    { name: 'POS', value: pos, icon: Store },
    { name: 'Online', value: online, icon: Globe },
    { name: 'TikTok Shop', value: tiktok, icon: Video },
  ].filter(item => item.value > 0);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Sales Channels</h3>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
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

      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { name: 'POS', value: pos, icon: Store },
          { name: 'Online', value: online, icon: Globe },
          { name: 'TikTok', value: tiktok, icon: Video },
        ].map((item, index) => {
          const Icon = item.icon;
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          
          return (
            <div key={item.name} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <Icon className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="text-xs font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground">{percentage}%</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
