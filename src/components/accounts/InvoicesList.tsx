import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { InvoiceDialog } from './InvoiceDialog';

export function InvoicesList({
  accountId,
  onRefresh,
}: {
  accountId: string;
  onRefresh: () => void;
}) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      setInvoices(data || []);
    };

    fetchInvoices();

    const channel = supabase
      .channel(`invoices-${accountId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `account_id=eq.${accountId}` },
        fetchInvoices
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Invoices</h3>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <div className="space-y-2">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{invoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">
                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${Number(invoice.amount).toFixed(2)}</p>
                <Badge className={`${getStatusColor(invoice.status)} capitalize`}>
                  {invoice.status}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
        {invoices.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No invoices yet</p>
        )}
      </div>

      <InvoiceDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        accountId={accountId}
        onSuccess={onRefresh}
      />
    </div>
  );
}