import { useState } from 'react';
import { useBrandContext } from '@/hooks/useBrandContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, Loader2, Store } from 'lucide-react';

interface StoreSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoreSettingsDialog({ open, onOpenChange }: StoreSettingsDialogProps) {
  const { currentBrand, refreshBrands } = useBrandContext();
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file || !currentBrand) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentBrand.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('brands')
        .update({ logo_url: publicUrl })
        .eq('id', currentBrand.id);

      if (updateError) throw updateError;

      await refreshBrands();
      toast.success('Logo updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentBrand) return;

    try {
      setUpdating(true);
      const formData = new FormData(e.currentTarget);
      
      const updates = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        website: formData.get('website') as string,
        contact_email: formData.get('contact_email') as string,
        contact_phone: formData.get('contact_phone') as string,
      };

      const { error } = await supabase
        .from('brands')
        .update(updates)
        .eq('id', currentBrand.id);

      if (error) throw error;

      await refreshBrands();
      toast.success('Store settings updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update store settings');
    } finally {
      setUpdating(false);
    }
  };

  if (!currentBrand) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Settings
          </DialogTitle>
          <DialogDescription>
            Manage your store information and branding
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Logo Section */}
          <div className="space-y-4">
            <Label>Store Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-border bg-card flex items-center justify-center overflow-hidden">
                {currentBrand.logo_url ? (
                  <img 
                    src={currentBrand.logo_url} 
                    alt={currentBrand.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('logo')?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Logo will appear in the top left corner
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={currentBrand.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={currentBrand.description || ''}
                rows={3}
                placeholder="Brief description of your store..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                defaultValue={currentBrand.website || ''}
                placeholder="https://example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  defaultValue={currentBrand.contact_email || ''}
                  placeholder="contact@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  type="tel"
                  defaultValue={currentBrand.contact_phone || ''}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
