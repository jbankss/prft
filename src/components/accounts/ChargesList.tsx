import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ChargeDialog } from './ChargeDialog';

export function ChargesList({
  accountId,
  onRefresh,
}: {
  accountId: string;
  onRefresh: () => void;
}) {
  const [charges, setCharges] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const fetchCharges = async () => {
      const { data } = await supabase
        .from('charges')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      setCharges(data || []);
    };

    fetchCharges();

    const channel = supabase
      .channel(`charges-${accountId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'charges', filter: `account_id=eq.${accountId}` },
        fetchCharges
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Charges</h3>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Charge
        </Button>
      </div>

      <div className="space-y-2">
        {charges.map((charge) => (
          <Card key={charge.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{charge.description}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(charge.charge_date).toLocaleDateString()}
                </p>
              </div>
              <p className="font-semibold">${Number(charge.amount).toFixed(2)}</p>
            </div>
          </Card>
        ))}
        {charges.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No charges yet</p>
        )}
      </div>

      <ChargeDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        accountId={accountId}
        onSuccess={onRefresh}
      />
    </div>
  );
}