import { useState } from 'react';
import { useBrandContext } from '@/hooks/useBrandContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Loader2, Store, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function StoreSettings() {
  const navigate = useNavigate();
  const {
    currentBrand,
    refreshBrands
  } = useBrandContext();
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file || !currentBrand) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentBrand.id}/${Date.now()}.${fileExt}`;
      const {
        error: uploadError
      } = await supabase.storage.from('brand-logos').upload(fileName, file, {
        upsert: true
      });
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('brand-logos').getPublicUrl(fileName);
      const {
        error: updateError
      } = await supabase.from('brands').update({
        logo_url: publicUrl
      }).eq('id', currentBrand.id);
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
        contact_phone: formData.get('contact_phone') as string
      };
      const {
        error
      } = await supabase.from('brands').update(updates).eq('id', currentBrand.id);
      if (error) throw error;
      await refreshBrands();
      toast.success('Store settings updated successfully');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update store settings');
    } finally {
      setUpdating(false);
    }
  };
  if (!currentBrand) return null;
  return <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Store className="h-8 w-8" />
            Store Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your store information and branding
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Logo</CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 rounded-2xl border-2 border-border bg-card flex items-center justify-center overflow-hidden">
                  {currentBrand.logo_url ? <img src={currentBrand.logo_url} alt={currentBrand.name} className="w-full h-full object-cover" /> : <Store className="h-12 w-12 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <Input id="logo" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('logo')?.click()} disabled={uploading}>
                    {uploading ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </> : <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo
                      </>}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    Recommended size: 512x512px. Supports PNG, JPG, or SVG.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Store Name *</Label>
                <Input id="name" name="name" defaultValue={currentBrand.name} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={currentBrand.description || ''} rows={4} placeholder="Brief description of your store..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" type="url" defaultValue={currentBrand.website || ''} placeholder="https://example.com" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input id="contact_email" name="contact_email" type="email" defaultValue={currentBrand.contact_email || ''} placeholder="contact@example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input id="contact_phone" name="contact_phone" type="tel" defaultValue={currentBrand.contact_phone || ''} placeholder="+1 (555) 123-4567" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updating}>
              {updating ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>;
}