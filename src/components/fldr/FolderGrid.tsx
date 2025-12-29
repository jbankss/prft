import { useState, useEffect } from 'react';
import { Folder, Plus, Clock, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  cover_asset_id: string | null;
}

interface FolderGridProps {
  onNavigateToAssets: () => void;
  onCollectionSelect?: (collectionId: string) => void;
  showQuickAccess?: boolean;
}

export function FolderGrid({ onNavigateToAssets, onCollectionSelect, showQuickAccess = true }: FolderGridProps) {
  const { currentBrand } = useBrandContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recentAssetCount, setRecentAssetCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBrand) {
      fetchData();
    }
  }, [currentBrand]);

  const fetchData = async () => {
    if (!currentBrand) return;
    
    try {
      // Fetch collections
      const { data: collectionsData } = await supabase
        .from('asset_collections')
        .select('*')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false })
        .limit(6);

      setCollections(collectionsData || []);

      // Fetch recent asset count (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count } = await supabase
        .from('creative_assets')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id)
        .gte('created_at', weekAgo.toISOString());

      setRecentAssetCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch folder data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickAccessFolders = [
    {
      id: 'recent',
      name: 'Recent',
      icon: Clock,
      color: 'bg-blue-500/10 text-blue-500',
      count: recentAssetCount,
    },
    {
      id: 'all',
      name: 'All Assets',
      icon: Image,
      color: 'bg-primary/10 text-primary',
      count: null,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Access - conditionally rendered */}
      {showQuickAccess && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickAccessFolders.map((folder) => {
              const Icon = folder.icon;
              return (
                <button
                  key={folder.id}
                  onClick={onNavigateToAssets}
                  className="group p-4 bg-card border border-border rounded-2xl hover:bg-muted/50 hover:border-primary/20 transition-all duration-200 text-left"
                >
                  <div className={cn("p-2 rounded-xl w-fit mb-3", folder.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-medium text-sm">{folder.name}</p>
                  {folder.count !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {folder.count} {folder.count === 1 ? 'file' : 'files'}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Collections */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Collections</h3>
          <Button variant="ghost" size="sm" className="text-xs h-7">
            <Plus className="h-3 w-3 mr-1" />
            New Collection
          </Button>
        </div>
        
        {collections.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Folder className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No collections yet. Create one to organize your assets.
            </p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {collections.map((collection, index) => (
              <button
                key={collection.id}
                onClick={() => onCollectionSelect?.(collection.id)}
                className={cn(
                  "group p-4 bg-card border border-border rounded-2xl hover:bg-muted/50 hover:border-primary/20 transition-all duration-200 text-left animate-fade-in",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-2 rounded-xl bg-amber-500/10 w-fit mb-3">
                  <Folder className="h-5 w-5 text-amber-500" />
                </div>
                <p className="font-medium text-sm truncate">{collection.name}</p>
                {collection.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {collection.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
