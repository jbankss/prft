import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const volumeData = [
  { label: 'Online Payments', amount: 24500, color: 'hsl(142, 71%, 45%)' },
  { label: 'Subscriptions', amount: 12300, color: 'hsl(217, 91%, 60%)' },
  { label: 'In-Store Sales', amount: 4700, color: 'hsl(350, 89%, 60%)' },
];

export function GrossVolumeCard() {
  const total = volumeData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Gross Volume</h3>
      <div className="text-5xl font-bold mb-8">
        ${total.toLocaleString()}
      </div>

      <div className="space-y-4">
        {volumeData.map((item) => {
          const percentage = (item.amount / total) * 100;
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium">${item.amount.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${percentage}%`,
                    background: `repeating-linear-gradient(
                      45deg,
                      ${item.color},
                      ${item.color} 4px,
                      transparent 4px,
                      transparent 8px
                    )`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
