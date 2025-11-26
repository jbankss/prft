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
      <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Asset' : asset.title || asset.file_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {asset.mime_type.startsWith('image/') ? (
              <img
                src={getAssetUrl()}
                alt={asset.title || asset.file_name}
                className="w-full rounded-lg shadow-apple-md"
              />
            ) : asset.mime_type.startsWith('video/') ? (
              <video
                src={getAssetUrl()}
                controls
                className="w-full rounded-lg shadow-apple-md"
              />
            ) : (
              <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">{asset.file_type.toUpperCase()} File</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Original
              </Button>
              {(user?.id === asset.uploaded_by || asset.uploaded_by === user?.id) && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
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
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-muted-foreground">File Name</Label>
                  <p className="font-medium">{asset.file_name}</p>
                </div>

                {asset.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p>{asset.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="capitalize">{asset.category}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className="capitalize">{asset.status}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">File Size</Label>
                    <p>{formatFileSize(asset.file_size)}</p>
                  </div>
                  {asset.width && asset.height && (
                    <div>
                      <Label className="text-muted-foreground">Dimensions</Label>
                      <p>{asset.width} × {asset.height}</p>
                    </div>
                  )}
                </div>

                {asset.tags && asset.tags.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {asset.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Uploaded</Label>
                  <p>{new Date(asset.created_at).toLocaleString()}</p>
                  {asset.profiles?.full_name && (
                    <p className="text-sm text-muted-foreground">by {asset.profiles.full_name}</p>
                  )}
                </div>

                <Button onClick={() => setEditing(true)} variant="outline" className="w-full">
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