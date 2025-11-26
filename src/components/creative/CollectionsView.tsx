import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

export function CollectionsView({ onRefresh }: { onRefresh: () => void }) {
  const { currentBrand } = useBrandContext();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollections = async () => {
    if (!currentBrand) return;
    
    try {
      const { data, error } = await supabase
        .from('asset_collections')
        .select('*, profiles(full_name), creative_assets!asset_collections_cover_asset_id_fkey(*)')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBrand) {
      fetchCollections();

      const channel = supabase
        .channel('collections-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_collections' }, fetchCollections)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentBrand]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Collections</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <Card className="p-12 text-center glass">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            No collections yet. Create collections to organize your assets.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Collection
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              className="p-6 glass shadow-apple-md hover:shadow-apple-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <FolderOpen className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-semibold">{collection.name}</h4>
                  {collection.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Created {new Date(collection.created_at).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}