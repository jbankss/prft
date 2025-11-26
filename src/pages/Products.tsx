import { Card } from '@/components/ui/card';

export default function Products() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Products</h1>
      <Card className="p-6">
        <p className="text-muted-foreground">Product catalog and inventory management will be displayed here.</p>
      </Card>
    </div>
  );
}
