import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Upload, FileText, ExternalLink } from 'lucide-react';
import { InvoiceDialog } from './InvoiceDialog';
import { InvoiceUploadDialog } from './InvoiceUploadDialog';

export function InvoicesList({
  accountId,
  onRefresh,
}: {
  accountId: string;
  onRefresh: () => void;
}) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

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
      case 'partial':
        return 'bg-blue-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'shopify':
        return 'Shopify';
      case 'brandboom':
        return 'BrandBoom';
      case 'upload':
        return 'Uploaded';
      default:
        return 'Manual';
    }
  };

  const handleViewPdf = async (pdfUrl: string) => {
    try {
      const { data } = await supabase
        .storage
        .from('design-assets')
        .createSignedUrl(pdfUrl, 3600); // 1 hour expiry

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting PDF URL:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <h3 className="font-semibold">Invoices</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{invoice.invoice_number}</p>
                  {invoice.pdf_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleViewPdf(invoice.pdf_url)}
                      title="View PDF"
                    >
                      <FileText className="h-4 w-4 text-primary" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">
                    Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                  </p>
                  {invoice.source && invoice.source !== 'manual' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {getSourceLabel(invoice.source)}
                    </Badge>
                  )}
                </div>
                {invoice.status === 'partial' && invoice.paid_amount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid: ${Number(invoice.paid_amount).toFixed(2)} of ${Number(invoice.amount).toFixed(2)}
                  </p>
                )}
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

      <InvoiceUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        accountId={accountId}
        onSuccess={onRefresh}
      />
    </div>
  );
}
