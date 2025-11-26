import { Card } from '@/components/ui/card';

export default function Balances() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Balances</h1>
      <Card className="p-6">
        <p className="text-muted-foreground">Account balances and payout information will be displayed here.</p>
      </Card>
    </div>
  );
}
