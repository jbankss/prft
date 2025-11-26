import { Card } from '@/components/ui/card';

export default function Connect() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Connect</h1>
      <Card className="p-6">
        <p className="text-muted-foreground">Integration connections and API settings will be displayed here.</p>
      </Card>
    </div>
  );
}
