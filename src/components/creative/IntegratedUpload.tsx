import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBrandContext } from '@/hooks/useBrandContext';
import { useCreativePermissions } from '@/hooks/useCreativePermissions';
import { supabase } from '@/integrations/supabase/client';
import { logCreativeActivity } from '@/lib/creativeActivityLogger';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileImage, Sparkles, FolderOpen, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileWithPath extends File {
  relativePath?: string;
}

export function IntegratedUpload({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { currentBrand } = useBrandContext();
  const { canUploadDirect, roleLevel } = useCreativePermissions();
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: 'photography',
    status: 'pending',
    title: '',
    description: '',
    tags: '',
    aiTagging: false,
  });

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const items = e.dataTransfer.items;
    const fileList: FileWithPath[] = [];
    let detectedFolderName: string | null = null;

    // Check for folder drops
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry?.();
        if (item?.isDirectory) {
          detectedFolderName = item.name;
        }
      }
    }

    const droppedFiles = Array.from(e.dataTransfer.files) as FileWithPath[];
    droppedFiles.forEach(file => {
      // Try to extract relative path from webkit
      const relativePath = (file as any).webkitRelativePath || file.name;
      file.relativePath = relativePath;
      
      // Try to detect folder name from path
      if (relativePath.includes('/')) {
        const parts = relativePath.split('/');
        if (!detectedFolderName && parts.length > 1) {
          detectedFolderName = parts[0];
        }
      }
      fileList.push(file);
    });

    if (detectedFolderName) {
      setFolderName(detectedFolderName);
      setFormData(prev => ({ ...prev, title: detectedFolderName || '' }));
    }
    
    setFiles(prev => [...prev, ...fileList]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files) as FileWithPath[];
      let detectedFolderName: string | null = null;
      
      selectedFiles.forEach(file => {
        const relativePath = (file as any).webkitRelativePath || file.name;
        file.relativePath = relativePath;
        
        if (relativePath.includes('/')) {
          const parts = relativePath.split('/');
          if (!detectedFolderName && parts.length > 1) {
            detectedFolderName = parts[0];
          }
        }
      });

      if (detectedFolderName) {
        setFolderName(detectedFolderName);
        setFormData(prev => ({ ...prev, title: detectedFolderName || '' }));
      }
      
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files) as FileWithPath[];
      let detectedFolderName: string | null = null;
      
      selectedFiles.forEach(file => {
        const relativePath = (file as any).webkitRelativePath || file.name;
        file.relativePath = relativePath;
        
        if (relativePath.includes('/')) {
          const parts = relativePath.split('/');
          if (!detectedFolderName && parts.length > 1) {
            detectedFolderName = parts[0];
          }
        }
      });

      if (detectedFolderName) {
        setFolderName(detectedFolderName);
        setFormData(prev => ({ ...prev, title: detectedFolderName || '' }));
      }
      
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length <= 1) {
      setFolderName(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !user || !currentBrand) return;

    setUploading(true);
    setProgress(0);

    try {
      const bucket = formData.category === 'logo' || formData.category === 'rules' 
        ? 'design-assets' 
        : 'creative-assets';

      // Determine initial status based on permissions
      const initialStatus = canUploadDirect ? 'approved' : 'pending';
      
      // Create upload session for batch tracking
      let sessionId: string | null = null;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('upload_sessions')
        .insert({
          brand_id: currentBrand.id,
          uploaded_by: user.id,
          title: formData.title || folderName || `Upload ${new Date().toLocaleDateString()}`,
          status: canUploadDirect ? 'approved' : 'pending_approval',
          file_count: files.length,
          total_size: totalSize,
          source_folder_name: folderName,
          metadata: {
            category: formData.category,
            description: formData.description,
            tags: formData.tags
          }
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      sessionId = sessionData.id;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        setProgress(((i / files.length) * 100) + 5);

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setProgress(((i / files.length) * 100) + 15);

        let width, height;
        if (file.type.startsWith('image/')) {
          const img = await createImageBitmap(file);
          width = img.width;
          height = img.height;
        }

        setProgress(((i / files.length) * 100) + 20);

        let initialTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];

        const { data: assetData, error: dbError } = await supabase.from('creative_assets').insert({
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: fileExt || '',
          mime_type: file.type,
          bucket,
          width,
          height,
          title: formData.title || file.name,
          description: formData.description,
          tags: initialTags,
          status: initialStatus,
          category: formData.category,
          uploaded_by: user.id,
          brand_id: currentBrand.id,
          upload_session_id: sessionId,
          metadata: {
            relative_path: file.relativePath,
            source_folder: folderName
          }
        }).select().single();

        if (dbError) throw dbError;

        await logCreativeActivity({
          action: 'uploaded_asset',
          entityType: 'asset',
          entityId: assetData.id,
          brandId: currentBrand.id,
          metadata: { 
            file_name: file.name, 
            file_size: file.size,
            session_id: sessionId,
            requires_approval: !canUploadDirect
          }
        });

        setProgress(((i / files.length) * 100) + 25);

        if (formData.aiTagging && file.type.startsWith('image/') && assetData) {
          try {
            const { data: { publicUrl } } = supabase.storage
              .from(bucket)
              .getPublicUrl(filePath);

            setProgress(((i / files.length) * 100) + 30);

            const { data: aiResult } = await supabase.functions.invoke('analyze-image', {
              body: { imageUrl: publicUrl, brandId: currentBrand.id }
            });

            if (aiResult?.tags && Array.isArray(aiResult.tags)) {
              const combinedTags = [...new Set([...initialTags, ...aiResult.tags])];
              
              await supabase
                .from('creative_assets')
                .update({ tags: combinedTags })
                .eq('id', assetData.id);
            }
          } catch (aiError) {
            console.error('AI tagging error:', aiError);
          }
        }

        setProgress(((i + 1) / files.length) * 100);
      }

      if (canUploadDirect) {
        toast.success(`Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
      } else {
        toast.success(`Submitted ${files.length} file${files.length > 1 ? 's' : ''} for approval`);
      }
      
      setFiles([]);
      setFolderName(null);
      setFormData({
        category: 'photography',
        status: 'pending',
        title: '',
        description: '',
        tags: '',
        aiTagging: false,
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-display font-semibold mb-2">Upload Assets</h2>
        <p className="text-muted-foreground text-lg">Upload your creative files with full quality storage</p>
      </div>

      {/* Permission indicator */}
      <div className="flex items-center gap-2">
        {canUploadDirect ? (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Direct upload enabled
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Uploads require approval
          </Badge>
        )}
      </div>

      <Card className="p-10 space-y-8">
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-3xl p-16 text-center hover:border-primary transition-colors cursor-pointer bg-muted/30"
          onClick={() => document.getElementById('file-input-integrated')?.click()}
        >
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="text-xl font-semibold mb-2">
                Drop files or folders here, or click to browse
              </p>
              <p className="text-muted-foreground">
                Max 500MB per file. Supports images, videos, and design files.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('file-input-integrated')?.click();
                }}
              >
                <FileImage className="h-4 w-4 mr-2" />
                Select Files
              </Button>
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('folder-input-integrated')?.click();
                }}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Select Folder
              </Button>
            </div>
          </div>
          <input
            id="file-input-integrated"
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,.psd,.ai,.pdf"
          />
          <input
            id="folder-input-integrated"
            type="file"
            multiple
            onChange={handleFolderSelect}
            className="hidden"
            accept="image/*,video/*,.psd,.ai,.pdf"
            {...{ webkitdirectory: '', directory: '' } as any}
          />
        </div>

        {folderName && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <FolderOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Folder detected: {folderName}</span>
            <span className="text-sm text-muted-foreground">({files.length} files)</span>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base">Selected Files ({files.length})</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileImage className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                      {file.relativePath && file.relativePath !== file.name && (
                        <span className="ml-2 text-muted-foreground/70">
                          {file.relativePath}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photography">Photography</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="logo">Logo</SelectItem>
                <SelectItem value="rules">Design Rules</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canUploadDirect && (
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
          )}
        </div>

        <div className="space-y-2">
          <Label>Title {folderName && '(auto-detected from folder)'}</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Asset title or batch name"
          />
        </div>

        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the asset..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Tags (comma-separated, optional)</Label>
          <Input
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="e.g., summer, campaign, hero"
          />
        </div>

        <div className="flex items-center space-x-2 p-3 border border-border rounded-lg bg-muted/30">
          <Checkbox
            id="ai-tagging-integrated"
            checked={formData.aiTagging}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, aiTagging: checked as boolean })
            }
          />
          <div className="flex-1">
            <label
              htmlFor="ai-tagging-integrated"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Auto-tag with AI
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically detect colors, moods, environments, and brand logos
            </p>
          </div>
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex justify-end gap-3">
          {!canUploadDirect && files.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
              <AlertCircle className="h-4 w-4" />
              Files will be submitted for Director approval
            </div>
          )}
          <Button 
            onClick={handleUpload} 
            disabled={files.length === 0 || uploading}
            size="lg"
          >
            {uploading 
              ? 'Uploading...' 
              : canUploadDirect 
                ? `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`
                : `Submit ${files.length} File${files.length !== 1 ? 's' : ''} for Approval`
            }
          </Button>
        </div>
      </Card>
    </div>
  );
}
