import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2 } from 'lucide-react';
import { BrandDocuments } from './BrandDocuments';
import { BrandChat } from './BrandChat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function BrandDetailsDialog({
  brandId,
  onClose,
  onRefresh,
}: {
  brandId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (brandId) {
      fetchBrand();
    }
  }, [brandId]);

  const fetchBrand = async () => {
    if (!brandId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;
      setBrand(data);
    } catch (error: any) {
      toast.error('Failed to fetch brand details');
    } finally {
      setLoading(false);
    }
  };

  if (!brandId) return null;

  return (
    <Dialog open={!!brandId} onOpenChange={() => onClose()}>
      <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {brand?.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <DialogTitle>{brand?.name || 'Brand Details'}</DialogTitle>
          </div>
        </DialogHeader>

        <Tabs defaultValue="documents" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="chat">Team Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="flex-1 overflow-auto">
            {brandId && <BrandDocuments brandId={brandId} />}
          </TabsContent>

          <TabsContent value="chat" className="flex-1 overflow-hidden">
            {brandId && <BrandChat brandId={brandId} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}