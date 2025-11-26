import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBrandContext } from '@/hooks/useBrandContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, FileImage, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function IntegratedUpload({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { currentBrand } = useBrandContext();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
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
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !user || !currentBrand) return;

    setUploading(true);
    setProgress(0);

    try {
      const bucket = formData.category === 'logo' || formData.category === 'rules' 
        ? 'design-assets' 
        : 'creative-assets';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        let width, height;
        if (file.type.startsWith('image/')) {
          const img = await createImageBitmap(file);
          width = img.width;
          height = img.height;
        }

        // Get initial tags
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
          status: formData.status,
          category: formData.category,
          uploaded_by: user.id,
          brand_id: currentBrand.id,
        }).select().single();

        if (dbError) throw dbError;

        // If AI tagging is enabled and it's an image, analyze it
        if (formData.aiTagging && file.type.startsWith('image/') && assetData) {
          try {
            const { data: { publicUrl } } = supabase.storage
              .from(bucket)
              .getPublicUrl(filePath);

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
            // Don't fail the upload if AI tagging fails
          }
        }

        setProgress(((i + 1) / files.length) * 100);
      }

      toast.success(`Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
      setFiles([]);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Upload Assets</h2>
        <p className="text-muted-foreground">Upload your creative files with full quality storage</p>
      </div>

      <Card className="p-6 space-y-6">
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer bg-muted/30"
          onClick={() => document.getElementById('file-input-integrated')?.click()}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Max 500MB per file. Supports images, videos, and design files.
              </p>
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
        </div>

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
        </div>

        <div className="space-y-2">
          <Label>Title (optional)</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Asset title"
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

        <div className="flex justify-end">
          <Button 
            onClick={handleUpload} 
            disabled={files.length === 0 || uploading}
            size="lg"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
