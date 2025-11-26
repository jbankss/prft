import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Sparkles } from 'lucide-react';

const data = [
  { name: 'Initiated', value: 65200, color: 'hsl(217, 91%, 60%)' },
  { name: 'Authorized', value: 54800, color: 'hsl(217, 91%, 60%)' },
  { name: 'Successful', value: 48600, color: 'hsl(217, 91%, 60%)' },
  { name: 'Payouts', value: 38300, color: 'hsl(217, 91%, 60%)' },
  { name: 'Completed', value: 32900, color: 'hsl(217, 91%, 60%)' },
];

const tabs = ['Initiated Payments', 'Authorized Payments', 'Successful Payments', 'Payouts to Merchants', 'Completed Transactions'];

export function MetricBarChart() {
  const [activeTab, setActiveTab] = useState(2);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Payments</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b overflow-x-auto">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`pb-3 px-1 text-sm whitespace-nowrap transition-colors border-b-2 ${
              activeTab === idx
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-muted-foreground text-xs">{tab}</span>
              <span className="text-2xl font-semibold text-foreground">
                {(data[idx].value / 1000).toFixed(1)}k
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const value = payload[0].value as number;
                  const index = data.findIndex(d => d.value === value);
                  const conversion = index > 0 ? ((value / data[index - 1].value) * 100).toFixed(0) : '100';
                  const dropoff = index > 0 ? (100 - parseFloat(conversion)).toFixed(0) : '0';
                  
                  return (
                    <div className="bg-card border rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-medium">{value.toLocaleString()} transactions</p>
                      <p className="text-xs text-muted-foreground">
                        Conversion: {conversion}% | Drop-off: -{dropoff}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === activeTab ? 'hsl(217, 91%, 60%)' : 'hsl(217, 91%, 85%)'}
                  style={{
                    filter: index === activeTab ? 'none' : 'opacity(0.3)',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Insights */}
      <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2">What would you like to explore next?</p>
          <p className="text-sm">
            I want to know what caused the drop-off from authorized to{' '}
            <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded">successful payments</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
