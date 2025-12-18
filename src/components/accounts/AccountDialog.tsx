import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';

export function AccountDialog({
  open,
  onOpenChange,
  brands,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: any[];
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brand_id: '',
    account_name: '',
    manual_balance: '0',
    balance_notes: '',
    status: 'active',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data: newAccount, error } = await supabase.from('accounts').insert({
        brand_id: formData.brand_id,
        account_name: formData.account_name,
        balance: 0, // Legacy field
        manual_balance: parseFloat(formData.manual_balance),
        balance_notes: formData.balance_notes || null,
        status: formData.status,
        notes: formData.notes || null,
        created_by: user.id,
      }).select().single();

      if (error) throw error;

      // Log the activity
      await logActivity({
        action: 'created',
        entityType: 'account',
        entityId: newAccount.id,
        changes: { 
          account_name: formData.account_name, 
          manual_balance: formData.manual_balance 
        }
      });

      toast.success('Vendor account created successfully');
      setFormData({
        brand_id: '',
        account_name: '',
        manual_balance: '0',
        balance_notes: '',
        status: 'active',
        notes: '',
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Vendor Account</DialogTitle>
          <DialogDescription>
            Add a vendor/supplier account to track what you owe them for inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand_id">Brand *</Label>
            <Select value={formData.brand_id} onValueChange={(value) => setFormData({ ...formData, brand_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">Vendor Name *</Label>
            <Input
              id="account_name"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="e.g., Nike, Supreme, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual_balance">Amount Owed ($)</Label>
            <Input
              id="manual_balance"
              type="number"
              step="0.01"
              min="0"
              value={formData.manual_balance}
              onChange={(e) => setFormData({ ...formData, manual_balance: e.target.value })}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              How much you owe this vendor for inventory. This counts against your P&L.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance_notes">Balance Notes</Label>
            <Input
              id="balance_notes"
              value={formData.balance_notes}
              onChange={(e) => setFormData({ ...formData, balance_notes: e.target.value })}
              placeholder="e.g., PO #12345, Due on 12/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this vendor..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.brand_id || !formData.account_name}>
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
