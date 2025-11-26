import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  FolderOpen, 
  CheckCircle, 
  X 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
  collections: any[];
}

export function BulkActions({ 
  selectedIds, 
  onClearSelection, 
  onRefresh,
  collections 
}: BulkActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMoveToCollection = async (collectionId: string) => {
    setIsProcessing(true);
    try {
      const insertData = selectedIds.map(assetId => ({
        collection_id: collectionId,
        asset_id: assetId,
      }));

      const { error } = await supabase
        .from('collection_assets')
        .insert(insertData);

      if (error) throw error;

      toast.success(`Moved ${selectedIds.length} assets to collection`);
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to move assets');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeStatus = async (status: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('creative_assets')
        .update({ status })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`Updated ${selectedIds.length} assets`);
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update assets');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      // First get the file paths
      const { data: assets } = await supabase
        .from('creative_assets')
        .select('file_path, bucket')
        .in('id', selectedIds);

      if (assets) {
        // Delete from storage
        for (const asset of assets) {
          await supabase.storage
            .from(asset.bucket)
            .remove([asset.file_path]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('creative_assets')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`Deleted ${selectedIds.length} assets`);
      onClearSelection();
      onRefresh();
      setShowDeleteConfirm(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete assets');
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-4 flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            {selectedIds.length} selected
          </Badge>

          <div className="h-6 w-px bg-border" />

          <Select onValueChange={handleMoveToCollection} disabled={isProcessing}>
            <SelectTrigger className="w-48">
              <FolderOpen className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Move to collection" />
            </SelectTrigger>
            <SelectContent>
              {collections.map(collection => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleChangeStatus} disabled={isProcessing}>
            <SelectTrigger className="w-48">
              <CheckCircle className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="deployed">Deployed</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isProcessing}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <div className="h-6 w-px bg-border" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} assets?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected assets
              from storage and the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isProcessing}>
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
