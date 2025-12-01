import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { CollectionDetail } from './CollectionDetail';
import { toast } from 'sonner';

export function CollectionsView({ onRefresh }: { onRefresh: () => void }) {
  const { currentBrand } = useBrandContext();
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
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

  if (selectedCollection) {
    return (
      <CollectionDetail
        collection={selectedCollection}
        onBack={() => setSelectedCollection(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-3xl font-display font-semibold">Collections</h3>
        <Button size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <Card className="p-16 text-center">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <p className="text-muted-foreground mb-6 text-lg">
            No collections yet. Create collections to organize your assets.
          </p>
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Create Collection
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              className="p-8 hover:shadow-md cursor-pointer transition-all"
              onClick={() => setSelectedCollection(collection)}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-semibold text-xl mb-1">{collection.name}</h4>
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