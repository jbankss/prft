import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';

export default function Customers() {
  const { currentBrand } = useBrandContext();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['customers', currentBrand?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brandboom_orders')
        .select('buyer_name, buyer_email, total_amount')
        .eq('brand_id', currentBrand?.id)
        .order('buyer_name');

      if (error) throw error;

      // Group by buyer
      const buyers = data.reduce((acc: any, order) => {
        if (!acc[order.buyer_name]) {
          acc[order.buyer_name] = {
            name: order.buyer_name,
            email: order.buyer_email,
            totalSpent: 0,
            orderCount: 0,
          };
        }
        acc[order.buyer_name].totalSpent += order.total_amount;
        acc[order.buyer_name].orderCount += 1;
        return acc;
      }, {});

      return Object.values(buyers);
    },
    enabled: !!currentBrand?.id,
  });

  if (isLoading) {
    return <div className="flex justify-center p-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Customers</h1>
      <Card className="p-6">
        <div className="space-y-4">
          {orders?.map((buyer: any) => (
            <div key={buyer.name} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{buyer.name}</div>
                <div className="text-sm text-muted-foreground">{buyer.email}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">${buyer.totalSpent.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{buyer.orderCount} orders</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
