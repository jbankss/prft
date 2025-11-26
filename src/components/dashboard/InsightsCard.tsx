import { Card } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export function InsightsCard() {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, hsl(200, 70%, 90%) 0%, hsl(217, 91%, 85%) 50%, hsl(217, 91%, 70%) 100%)',
        }}
      />
      <div className="relative p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
        <Lightbulb className="w-8 h-8 text-primary mb-3" />
        <div className="text-6xl font-bold text-primary mb-2">75%</div>
        <p className="text-sm text-primary/70 text-center">Payment Success Rate</p>
      </div>
    </Card>
  );
}
