import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Trash2, Save, X, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  is_revision: boolean;
  created_at: string;
  profiles: { full_name: string };
}

interface Approval {
  id: string;
  status: string;
  notes: string | null;
  reviewed_at: string | null;
  requested_by: string;
  reviewed_by: string | null;
  profiles: { full_name: string };
}

export function EnhancedAssetLightbox({
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isRevision, setIsRevision] = useState(false);
  const [formData, setFormData] = useState({
    title: asset.title || '',
    description: asset.description || '',
    status: asset.status,
    tags: asset.tags?.join(', ') || '',
  });

  useEffect(() => {
    fetchComments();
    fetchApprovals();
  }, [asset.id]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('asset_comments')
      .select('*, profiles(full_name)')
      .eq('asset_id', asset.id)
      .order('created_at', { ascending: false });
    setComments(data || []);
  };

  const fetchApprovals = async () => {
    const { data } = await supabase
      .from('asset_approvals')
      .select('*, profiles!asset_approvals_requested_by_fkey(full_name)')
      .eq('asset_id', asset.id)
      .order('created_at', { ascending: false });
    setApprovals(data as any || []);
  };

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

      // Log activity
      await supabase.from('creative_activity_logs').insert({
        brand_id: asset.brand_id,
        user_id: user?.id,
        action: 'updated_asset',
        entity_type: 'asset',
        entity_id: asset.id,
        metadata: { changes: formData }
      });

      toast.success('Asset updated successfully');
      setEditing(false);
      onRefresh();
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

      // Log activity
      await supabase.from('creative_activity_logs').insert({
        brand_id: asset.brand_id,
        user_id: user?.id,
        action: 'deleted_asset',
        entity_type: 'asset',
        entity_id: asset.id,
        metadata: { file_name: asset.file_name }
      });

      toast.success('Asset deleted successfully');
      onRefresh();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await supabase.from('asset_comments').insert({
        asset_id: asset.id,
        user_id: user?.id,
        comment: newComment,
        is_revision: isRevision
      });

      setNewComment('');
      setIsRevision(false);
      fetchComments();
      toast.success('Comment added');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRequestApproval = async () => {
    try {
      await supabase.from('asset_approvals').insert({
        asset_id: asset.id,
        requested_by: user?.id,
      });

      fetchApprovals();
      toast.success('Approval requested');
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
          {/* Left: Asset Preview */}
          <div className="bg-muted/30 p-8 flex flex-col">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex-1 flex items-center justify-center mb-6">
              {asset.mime_type.startsWith('image/') ? (
                <img
                  src={getAssetUrl()}
                  alt={asset.title || asset.file_name}
                  className="max-w-full max-h-full object-contain rounded-3xl"
                />
              ) : asset.mime_type.startsWith('video/') ? (
                <video
                  src={getAssetUrl()}
                  controls
                  className="max-w-full max-h-full rounded-3xl"
                />
              ) : (
                <div className="w-full aspect-video rounded-3xl bg-card border border-border flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                      <span className="text-3xl font-bold">{asset.file_type.toUpperCase()}</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Document File</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {user?.id === asset.uploaded_by && (
                <Button variant="destructive" onClick={handleDelete} size="lg">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Right: Details and Actions */}
          <div className="flex flex-col max-h-[95vh]">
            <div className="p-8 border-b border-border">
              <h2 className="text-3xl font-display font-semibold mb-2">
                {asset.title || asset.file_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Uploaded {new Date(asset.created_at).toLocaleDateString()} by {asset.profiles?.full_name || 'Unknown'}
              </p>
            </div>

            <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto">
                <TabsTrigger value="details" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Details</TabsTrigger>
                <TabsTrigger value="comments" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Comments {comments.length > 0 && `(${comments.length})`}
                </TabsTrigger>
                <TabsTrigger value="approvals" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Approvals {approvals.length > 0 && `(${approvals.length})`}
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="details" className="p-8 space-y-6 mt-0">
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
                          placeholder="e.g., summer, campaign, hero"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button onClick={handleSave} className="flex-1" size="lg">
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setEditing(false)} size="lg">
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-2xl bg-muted/50">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">File Name</Label>
                        <p className="font-medium mt-1">{asset.file_name}</p>
                      </div>

                      {asset.description && (
                        <div className="p-4 rounded-2xl bg-muted/50">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
                          <p className="mt-1">{asset.description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-muted/50">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
                          <p className="capitalize mt-1 font-medium">{asset.category}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/50">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
                          <div className="mt-1">
                            <Badge variant="secondary" className="capitalize">
                              {asset.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-muted/50">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">File Size</Label>
                          <p className="mt-1 font-medium">{formatFileSize(asset.file_size)}</p>
                        </div>
                        {asset.width && asset.height && (
                          <div className="p-4 rounded-2xl bg-muted/50">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Dimensions</Label>
                            <p className="mt-1 font-medium">{asset.width} × {asset.height}</p>
                          </div>
                        )}
                      </div>

                      {asset.tags && asset.tags.length > 0 && (
                        <div className="p-4 rounded-2xl bg-muted/50">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Tags</Label>
                          <div className="flex flex-wrap gap-2">
                            {asset.tags.map((tag: string, i: number) => (
                              <Badge key={i} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button onClick={() => setEditing(true)} variant="outline" className="w-full" size="lg">
                        Edit Details
                      </Button>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="p-8 space-y-6 mt-0">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Add a comment or revision note..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <Button onClick={handleAddComment} className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Comment
                      </Button>
                      <Button
                        variant={isRevision ? "default" : "outline"}
                        onClick={() => setIsRevision(!isRevision)}
                      >
                        {isRevision ? 'Revision' : 'Regular'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-4 rounded-2xl bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{comment.profiles.full_name}</span>
                          <div className="flex items-center gap-2">
                            {comment.is_revision && (
                              <Badge variant="gold" className="text-xs">Revision</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No comments yet</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="approvals" className="p-8 space-y-6 mt-0">
                  <Button onClick={handleRequestApproval} className="w-full" size="lg">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Request Approval
                  </Button>

                  <div className="space-y-3">
                    {approvals.map((approval) => (
                      <div key={approval.id} className="p-4 rounded-2xl bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{approval.profiles.full_name}</span>
                          <Badge 
                            variant={
                              approval.status === 'approved' ? 'success' :
                              approval.status === 'rejected' ? 'destructive' :
                              approval.status === 'changes_requested' ? 'gold' :
                              'secondary'
                            }
                            className="capitalize"
                          >
                            {approval.status === 'changes_requested' ? 'Changes Requested' : approval.status}
                          </Badge>
                        </div>
                        {approval.notes && <p className="text-sm">{approval.notes}</p>}
                        <p className="text-xs text-muted-foreground">
                          {approval.reviewed_at 
                            ? `Reviewed ${new Date(approval.reviewed_at).toLocaleString()}`
                            : 'Pending review'
                          }
                        </p>
                      </div>
                    ))}
                    {approvals.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No approval requests yet</p>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}