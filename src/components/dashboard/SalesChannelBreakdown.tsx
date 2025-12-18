import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Store, Globe, Video, TrendingUp } from 'lucide-react';

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

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))'];

  // Calculate average order values (mock data - in real app would come from props)
  const channelData = [
    { name: 'POS', value: pos, avgOrder: pos > 0 ? (pos / Math.max(1, Math.floor(pos / 150))).toFixed(0) : 0, icon: Store },
    { name: 'Online', value: online, avgOrder: online > 0 ? (online / Math.max(1, Math.floor(online / 120))).toFixed(0) : 0, icon: Globe },
    { name: 'TikTok', value: tiktok, avgOrder: tiktok > 0 ? (tiktok / Math.max(1, Math.floor(tiktok / 80))).toFixed(0) : 0, icon: Video },
  ];

  return (
    <Card className="p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Sales Channels</h3>

      {/* Pie Chart - Larger */}
      <div className="h-[180px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
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

      {/* Channel Legend */}
      <div className="grid grid-cols-3 gap-2 my-4">
        {channelData.map((item, index) => {
          const Icon = item.icon;
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
          
          return (
            <div key={item.name} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="text-xs font-medium">{item.name}</div>
              <div className="text-sm font-bold">{percentage}%</div>
            </div>
          );
        })}
      </div>

      {/* Average Order Value Section */}
      <div className="border-t border-border pt-4 mt-auto">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Avg Order Value</span>
        </div>
        <div className="space-y-2">
          {channelData.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm font-semibold">${item.avgOrder}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
