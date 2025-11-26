import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

export function AssetDetailsDialog({
  asset,
  onClose,
  onRefresh,
}: {
  asset: any;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: asset.title || '',
    description: asset.description || '',
    status: asset.status,
    tags: asset.tags?.join(', ') || '',
  });

  const getAssetUrl = () => {
    const { data } = supabase.storage.from(asset.bucket).getPublicUrl(asset.file_path);
    return data.publicUrl;
  };

  const handleDownload = async () => {
    const url = getAssetUrl();
    const link = document.createElement('a');
    link.href = url;
    link.download = asset.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('creative_assets')
        .update({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        })
        .eq('id', asset.id);

      if (error) throw error;

      toast.success('Asset updated successfully');
      setEditing(false);
      onRefresh();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from(asset.bucket)
        .remove([asset.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('creative_assets')
        .delete()
        .eq('id', asset.id);

      if (dbError) throw dbError;

      toast.success('Asset deleted successfully');
      onRefresh();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={!!asset} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-semibold">
            {editing ? 'Edit Asset' : asset.title || asset.file_name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {asset.mime_type.startsWith('image/') ? (
              <div className="rounded-2xl overflow-hidden shadow-apple-lg border border-border/30 bg-card/50">
                <img
                  src={getAssetUrl()}
                  alt={asset.title || asset.file_name}
                  className="w-full object-contain"
                />
              </div>
            ) : asset.mime_type.startsWith('video/') ? (
              <div className="rounded-2xl overflow-hidden shadow-apple-lg border border-border/30">
                <video
                  src={getAssetUrl()}
                  controls
                  className="w-full"
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border border-border/30 flex items-center justify-center shadow-apple-md">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{asset.file_type.toUpperCase()}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground/70">Document File</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={handleDownload} 
                className="flex-1 shadow-sm hover:shadow-md transition-shadow"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {(user?.id === asset.uploaded_by || asset.uploaded_by === user?.id) && (
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  className="shadow-sm hover:shadow-md transition-shadow"
                  size="lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="deployed">Deployed</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tags (comma-separated)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., summer, campaign, hero"
                    className="h-11"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={handleSave} 
                    className="flex-1 shadow-sm hover:shadow-md transition-shadow"
                    size="lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditing(false)}
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                  <Label className="text-xs font-medium uppercase tracking-wide text-foreground/60">File Name</Label>
                  <p className="font-medium mt-1 text-foreground">{asset.file_name}</p>
                </div>

                {asset.description && (
                  <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                    <Label className="text-xs font-medium uppercase tracking-wide text-foreground/60">Description</Label>
                    <p className="mt-1 text-foreground/90">{asset.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                    <Label className="text-xs font-medium uppercase tracking-wide text-foreground/60">Category</Label>
                    <p className="capitalize mt-1 font-medium text-foreground">{asset.category}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                    <Label className="text-xs font-medium uppercase tracking-wide text-foreground/60">Status</Label>
                    <div className="mt-1">
                      <Badge variant="secondary" className="capitalize">
                        {asset.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                    <Label className="text-xs font-medium uppercase tracking-wide text-foreground/60">File Size</Label>
                    <p className="mt-1 font-medium text-foreground">{formatFileSize(asset.file_size)}</p>
                  </div>
                  {asset.width && asset.height && (
                    <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                      <Label className="text-xs font-medium uppercase tracking-wide text-foreground/60">Dimensions</Label>
                      <p className="mt-1 font-medium text-foreground">{asset.width} × {asset.height}</p>
                    </div>
                  )}
                </div>

                {asset.tags && asset.tags.length > 0 && (
                  <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                    <Label className="text-xs font-medium uppercase tracking-wide text-foreground/60 mb-2 block">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {asset.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="rounded-full">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                  <Label className="text-xs font-medium uppercase tracking-wide text-foreground/60">Uploaded</Label>
                  <p className="mt-1 text-foreground">{new Date(asset.created_at).toLocaleString()}</p>
                  {asset.profiles?.full_name && (
                    <p className="text-sm text-foreground/60 mt-1">by {asset.profiles.full_name}</p>
                  )}
                </div>

                <Button 
                  onClick={() => setEditing(true)} 
                  variant="outline" 
                  className="w-full shadow-sm hover:shadow-md transition-shadow"
                  size="lg"
                >
                  Edit Details
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}