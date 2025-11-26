import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';

export default function Payments() {
  const { currentBrand } = useBrandContext();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', currentBrand?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brandboom_payments')
        .select('*')
        .eq('brand_id', currentBrand?.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentBrand?.id,
  });

  if (isLoading) {
    return <div className="flex justify-center p-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payments</h1>
      <Card className="p-6">
        <div className="space-y-4">
          {payments?.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">${payment.amount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(payment.payment_date).toLocaleDateString()}
                </div>
              </div>
              <div className="text-sm">
                <span className={`px-2 py-1 rounded ${
                  payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
