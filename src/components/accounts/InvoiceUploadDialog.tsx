import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UploadedInvoice {
  id: string;
  file: File;
  fileName: string;
  extractedAmount: number | null;
  status: 'uploading' | 'extracting' | 'ready' | 'error' | 'saved';
  error?: string;
  confirmedAmount: string;
}

export function InvoiceUploadDialog({
  open,
  onOpenChange,
  accountId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<UploadedInvoice[]>([]);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter for PDFs only
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length !== files.length) {
      toast.error('Only PDF files are supported');
    }

    // Add files to state
    const newInvoices: UploadedInvoice[] = pdfFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      extractedAmount: null,
      status: 'uploading' as const,
      confirmedAmount: '',
    }));

    setInvoices(prev => [...prev, ...newInvoices]);

    // Process each file
    for (const invoice of newInvoices) {
      await processInvoice(invoice);
    }
  }, []);

  const processInvoice = async (invoice: UploadedInvoice) => {
    try {
      // Update status to extracting
      setInvoices(prev => prev.map(inv => 
        inv.id === invoice.id ? { ...inv, status: 'extracting' as const } : inv
      ));

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(invoice.file);
      });

      // Call edge function to extract total
      const { data, error } = await supabase.functions.invoke('extract-invoice-total', {
        body: { 
          fileBase64: base64,
          fileName: invoice.fileName,
        },
      });

      if (error) throw error;

      const extractedAmount = data?.total || null;

      setInvoices(prev => prev.map(inv => 
        inv.id === invoice.id ? { 
          ...inv, 
          status: 'ready' as const, 
          extractedAmount,
          confirmedAmount: extractedAmount?.toString() || '',
        } : inv
      ));
    } catch (error: any) {
      console.error('Error processing invoice:', error);
      setInvoices(prev => prev.map(inv => 
        inv.id === invoice.id ? { 
          ...inv, 
          status: 'error' as const, 
          error: error.message || 'Failed to extract total',
        } : inv
      ));
    }
  };

  const updateConfirmedAmount = (id: string, amount: string) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === id ? { ...inv, confirmedAmount: amount } : inv
    ));
  };

  const removeInvoice = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  const saveInvoices = async () => {
    const readyInvoices = invoices.filter(inv => inv.status === 'ready' && inv.confirmedAmount);
    if (readyInvoices.length === 0) {
      toast.error('No invoices ready to save');
      return;
    }

    setSaving(true);
    try {
      for (const invoice of readyInvoices) {
        const amount = parseFloat(invoice.confirmedAmount);
        if (isNaN(amount) || amount <= 0) continue;

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${invoice.fileName.replace(/\.[^/.]+$/, '').substring(0, 10)}`;

        // Create invoice record
        const { error } = await supabase.from('invoices').insert({
          account_id: accountId,
          invoice_number: invoiceNumber,
          amount,
          status: 'pending',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          notes: `Uploaded from: ${invoice.fileName}`,
          created_by: user?.id,
          source: 'upload',
        });

        if (error) throw error;

        // Mark as saved
        setInvoices(prev => prev.map(inv => 
          inv.id === invoice.id ? { ...inv, status: 'saved' as const } : inv
        ));
      }

      toast.success(`${readyInvoices.length} invoice(s) saved successfully`);
      onSuccess();
      onOpenChange(false);
      setInvoices([]);
    } catch (error: any) {
      console.error('Error saving invoices:', error);
      toast.error('Failed to save invoices');
    } finally {
      setSaving(false);
    }
  };

  const readyCount = invoices.filter(inv => inv.status === 'ready' && inv.confirmedAmount).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Invoices</DialogTitle>
          <DialogDescription>
            Upload PDF invoices and we'll automatically extract the total amount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="invoice-upload"
            />
            <label htmlFor="invoice-upload" className="cursor-pointer">
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop PDF invoices here, or click to browse
              </p>
              <Button variant="outline" size="sm" asChild>
                <span>Select Files</span>
              </Button>
            </label>
          </div>

          {/* Invoice List */}
          {invoices.length > 0 && (
            <ScrollArea className="max-h-80">
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <Card key={invoice.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{invoice.fileName}</p>
                        
                        {invoice.status === 'uploading' && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading...
                          </div>
                        )}
                        
                        {invoice.status === 'extracting' && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Extracting total...
                          </div>
                        )}
                        
                        {invoice.status === 'error' && (
                          <div className="flex items-center gap-2 text-xs text-destructive mt-1">
                            <AlertCircle className="h-3 w-3" />
                            {invoice.error}
                          </div>
                        )}
                        
                        {invoice.status === 'ready' && (
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-xs text-muted-foreground">Total:</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={invoice.confirmedAmount}
                                onChange={(e) => updateConfirmedAmount(invoice.id, e.target.value)}
                                className="w-32 pl-6 h-8 text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            {invoice.extractedAmount && (
                              <span className="text-xs text-muted-foreground">
                                (detected: ${invoice.extractedAmount.toFixed(2)})
                              </span>
                            )}
                          </div>
                        )}
                        
                        {invoice.status === 'saved' && (
                          <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                            <Check className="h-3 w-3" />
                            Saved
                          </div>
                        )}
                      </div>
                      
                      {invoice.status !== 'saved' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeInvoice(invoice.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveInvoices} 
              disabled={saving || readyCount === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${readyCount} Invoice${readyCount !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
