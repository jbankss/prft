import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface CollectionDetailProps {
  collection: any;
  onBack: () => void;
}

interface CollectionAsset {
  id: string;
  position: number;
  asset_id: string;
  creative_assets: any;
}

export function CollectionDetail({ collection, onBack }: CollectionDetailProps) {
  const [assets, setAssets] = useState<CollectionAsset[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_assets')
        .select('*, creative_assets(*)')
        .eq('collection_id', collection.id)
        .order('position', { ascending: true });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch collection assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [collection.id]);

  const handleDragStart = (e: React.DragEvent, assetId: string) => {
    setDraggedItem(assetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = assets.findIndex(a => a.id === draggedItem);
    const targetIndex = assets.findIndex(a => a.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newAssets = [...assets];
    const [removed] = newAssets.splice(draggedIndex, 1);
    newAssets.splice(targetIndex, 0, removed);

    // Update positions
    const updates = newAssets.map((asset, index) => ({
      id: asset.id,
      position: index,
    }));

    setAssets(newAssets);

    try {
      for (const update of updates) {
        await supabase
          .from('collection_assets')
          .update({ position: update.position })
          .eq('id', update.id);
      }
      toast.success('Reordered assets');
    } catch (error: any) {
      toast.error('Failed to reorder assets');
      fetchAssets(); // Revert on error
    }

    setDraggedItem(null);
  };

  const getAssetUrl = (asset: any) => {
    const { data } = supabase.storage
      .from(asset.bucket)
      .getPublicUrl(asset.file_path);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold">{collection.name}</h2>
          {collection.description && (
            <p className="text-muted-foreground">{collection.description}</p>
          )}
        </div>
      </div>

      {assets.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No assets in this collection yet. Add assets using bulk actions.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {assets.map((item) => {
            const asset = item.creative_assets;
            const isImage = asset.mime_type.startsWith('image/');
            const isDragging = draggedItem === item.id;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                className={`group cursor-move transition-all hover-lift ${
                  isDragging ? 'opacity-50 scale-95' : 'opacity-100'
                }`}
              >
                <Card className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {isImage ? (
                      <img
                        src={getAssetUrl(asset)}
                        alt={asset.title || asset.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate">
                      {asset.title || asset.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Position {item.position + 1}
                    </p>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
