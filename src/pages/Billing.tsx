import { Card } from '@/components/ui/card';

export default function Billing() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Billing</h1>
      <Card className="p-6">
        <p className="text-muted-foreground">Billing and invoice information will be displayed here.</p>
      </Card>
    </div>
  );
}
