import { useState, useCallback } from 'react';
import { Upload, Cloud, FileImage, FileVideo, File } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuickUploadCardProps {
  onNavigateToUpload: () => void;
}

export function QuickUploadCard({ onNavigateToUpload }: QuickUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Navigate to upload with files
    onNavigateToUpload();
  }, [onNavigateToUpload]);

  return (
    <Card
      className={cn(
        "p-6 cursor-pointer transition-all duration-300 border-2 border-dashed",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onNavigateToUpload}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "p-4 rounded-2xl mb-4 transition-all duration-300",
            isDragging ? "bg-primary/20" : "bg-primary/10"
          )}
        >
          {isDragging ? (
            <Cloud className="h-8 w-8 text-primary animate-bounce" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>

        <h3 className="font-semibold mb-1">
          {isDragging ? 'Drop files here' : 'Quick Upload'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {isDragging
            ? 'Release to upload'
            : 'Drag & drop files or click to browse'}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileImage className="h-3.5 w-3.5" />
            <span>Images</span>
          </div>
          <div className="flex items-center gap-1">
            <FileVideo className="h-3.5 w-3.5" />
            <span>Videos</span>
          </div>
          <div className="flex items-center gap-1">
            <File className="h-3.5 w-3.5" />
            <span>Documents</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
