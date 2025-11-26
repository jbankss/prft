import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DateRangePicker() {
  return (
    <div className="flex items-center gap-4">
      <Button variant="outline" className="gap-2">
        <Calendar className="w-4 h-4" />
        <span className="text-sm">Jan 01 – July 31</span>
      </Button>
      <span className="text-sm text-muted-foreground">compared to</span>
      <Button variant="outline" className="gap-2">
        <Calendar className="w-4 h-4" />
        <span className="text-sm">Aug 01 – Dec 31</span>
      </Button>
    </div>
  );
}
