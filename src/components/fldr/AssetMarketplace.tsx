import { useState, useMemo } from 'react';
import { Search, Grid3X3, LayoutGrid, SortAsc, SortDesc, Filter as FilterIcon } from 'lucide-react';
import { useBrandContext } from '@/hooks/useBrandContext';
import { useAssetCache } from '@/hooks/useAssetCache';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { FilterSidebar, FilterState } from './FilterSidebar';
import { AssetCard } from './AssetCard';
import { EnhancedAssetLightbox } from '@/components/creative/EnhancedAssetLightbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { classifyTags, getDynamicColorOptions, getDynamicMoodOptions, getDynamicStyleOptions } from '@/lib/tagClassifier';
import { cn } from '@/lib/utils';

const DEFAULT_FILTERS: FilterState = {
  colors: [],
  sizes: [],
  styles: [],
  moods: [],
  fileTypes: [],
  collections: [],
  statuses: [],
  dateRange: 'all',
};

interface AssetMarketplaceProps {
  onRefresh?: () => void;
}

export function AssetMarketplace({ onRefresh }: AssetMarketplaceProps) {
  const { currentBrand } = useBrandContext();
  const isMobile = useIsMobile();
  const { assets, collections, loading, refetch } = useAssetCache();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'size'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [gridColumns, setGridColumns] = useState<3 | 4>(4);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Extract and classify all unique tags from assets
  const { classifiedTags, dynamicColorOptions, dynamicMoodOptions, dynamicStyleOptions } = useMemo(() => {
    const allTags: string[] = [];
    assets.forEach((asset) => {
      asset.tags?.forEach((tag) => allTags.push(tag));
    });
    
    const classified = classifyTags(allTags);
    
    return {
      classifiedTags: classified,
      dynamicColorOptions: getDynamicColorOptions(classified),
      dynamicMoodOptions: getDynamicMoodOptions(classified),
      dynamicStyleOptions: getDynamicStyleOptions(classified),
    };
  }, [assets]);

  // Count active filters (removed tags from count since we removed that section)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.colors.length) count++;
    if (filters.sizes.length) count++;
    if (filters.styles.length) count++;
    if (filters.moods.length) count++;
    if (filters.fileTypes.length) count++;
    if (filters.collections.length) count++;
    if (filters.statuses.length) count++;
    if (filters.dateRange !== 'all') count++;
    return count;
  }, [filters]);

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Search filter - includes searching through tags
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (asset) =>
          asset.file_name.toLowerCase().includes(query) ||
          asset.title?.toLowerCase().includes(query) ||
          asset.description?.toLowerCase().includes(query) ||
          asset.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filters.statuses.length) {
      result = result.filter((asset) => filters.statuses.includes(asset.status));
    }

    // File type filter
    if (filters.fileTypes.length) {
      result = result.filter((asset) => {
        const type = asset.file_type.split('/')[0];
        return filters.fileTypes.some((ft) => {
          if (ft === 'image') return type === 'image';
          if (ft === 'video') return type === 'video';
          if (ft === 'document') return ['application/pdf', 'text/'].some(t => asset.file_type.includes(t));
          if (ft === 'design') return ['psd', 'ai', 'sketch', 'figma'].some(t => asset.file_type.includes(t));
          return false;
        });
      });
    }

    // Size filter
    if (filters.sizes.length) {
      result = result.filter((asset) => {
        if (!asset.width || !asset.height) return filters.sizes.includes('small');
        const mp = (asset.width * asset.height) / 1000000;
        return filters.sizes.some((size) => {
          if (size === 'small') return mp < 1;
          if (size === 'medium') return mp >= 1 && mp < 4;
          if (size === 'large') return mp >= 4 && mp < 8;
          if (size === '4k') return mp >= 8;
          return false;
        });
      });
    }

    // Color filter - match against classified color tags
    if (filters.colors.length) {
      result = result.filter((asset) => {
        if (!asset.tags) return false;
        return filters.colors.some((colorId) => {
          // Check if any of the asset's tags classify as this color
          return asset.tags?.some((tag) => {
            const normalized = tag.toLowerCase().replace(/[-_]/g, ' ');
            return normalized.includes(colorId.replace('-', ' '));
          });
        });
      });
    }

    // Mood filter - match against classified mood tags
    if (filters.moods.length) {
      result = result.filter((asset) => {
        if (!asset.tags) return false;
        return filters.moods.some((moodId) => {
          return asset.tags?.some((tag) => {
            const normalized = tag.toLowerCase();
            return normalized.includes(moodId);
          });
        });
      });
    }

    // Style filter - match against classified style tags
    if (filters.styles.length) {
      result = result.filter((asset) => {
        if (!asset.tags) return false;
        return filters.styles.some((styleId) => {
          return asset.tags?.some((tag) => {
            const normalized = tag.toLowerCase();
            return normalized.includes(styleId);
          });
        });
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (filters.dateRange) {
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }
      result = result.filter((asset) => new Date(asset.created_at) >= cutoff);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.title || a.file_name).localeCompare(b.title || b.file_name);
          break;
        case 'size':
          comparison = a.file_size - b.file_size;
          break;
        case 'recent':
        default:
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [assets, searchQuery, filters, sortBy, sortOrder]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleViewAsset = (asset: any) => {
    setSelectedAsset(asset);
    setLightboxOpen(true);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const filterSidebarContent = (
    <FilterSidebar
      filters={filters}
      onFiltersChange={setFilters}
      collections={collections}
      dynamicColors={dynamicColorOptions}
      dynamicMoods={dynamicMoodOptions}
      dynamicStyles={dynamicStyleOptions}
      activeFilterCount={activeFilterCount}
      onClearFilters={clearFilters}
    />
  );

  return (
    <div className="flex h-full">
      {/* Desktop Filter Sidebar */}
      {!isMobile && (
        <div className="hidden lg:block">
          {filterSidebarContent}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Filter Button */}
              {isMobile && (
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="relative">
                      <FilterIcon className="h-4 w-4" />
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-80">
                    {filterSidebarContent}
                  </SheetContent>
                </Sheet>
              )}

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>

              {/* Grid toggle */}
              <div className="hidden sm:flex items-center gap-1 border border-border rounded-lg p-1">
                <Button
                  variant={gridColumns === 3 ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setGridColumns(3)}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={gridColumns === 4 ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setGridColumns(4)}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredAssets.length} {filteredAssets.length === 1 ? 'asset' : 'assets'}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            {selectedIds.length > 0 && (
              <span className="text-primary font-medium">
                {selectedIds.length} selected
              </span>
            )}
          </div>
        </div>

        {/* Asset Grid */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div
              className={cn(
                "grid gap-4",
                gridColumns === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square fldr-thumb-shimmer rounded-xl" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-2xl bg-muted mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No assets found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery || activeFilterCount > 0
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first asset to get started'}
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-4",
                gridColumns === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {filteredAssets.map((asset, index) => (
                <div
                  key={asset.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                >
                  <AssetCard
                    asset={asset}
                    isSelected={selectedIds.includes(asset.id)}
                    onSelect={toggleSelect}
                    onView={handleViewAsset}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedAsset && lightboxOpen && (
        <EnhancedAssetLightbox
          asset={selectedAsset}
          onClose={() => {
            setLightboxOpen(false);
            setSelectedAsset(null);
          }}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
