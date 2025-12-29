import { useState } from 'react';
import { 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Palette, 
  Maximize2, 
  Sparkles, 
  Heart, 
  FileType, 
  Folder, 
  CheckCircle, 
  Calendar,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface FilterState {
  colors: string[];
  sizes: string[];
  styles: string[];
  moods: string[];
  fileTypes: string[];
  collections: string[];
  statuses: string[];
  dateRange: string;
  tags: string[];
}

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  collections: { id: string; name: string }[];
  availableTags: string[];
  activeFilterCount: number;
  onClearFilters: () => void;
}

const COLOR_OPTIONS = [
  { id: 'red', label: 'Red', color: '#ef4444' },
  { id: 'orange', label: 'Orange', color: '#f97316' },
  { id: 'yellow', label: 'Yellow', color: '#eab308' },
  { id: 'green', label: 'Green', color: '#22c55e' },
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'purple', label: 'Purple', color: '#a855f7' },
  { id: 'pink', label: 'Pink', color: '#ec4899' },
  { id: 'gray', label: 'Gray', color: '#6b7280' },
  { id: 'black', label: 'Black', color: '#171717' },
  { id: 'white', label: 'White', color: '#fafafa' },
];

const SIZE_OPTIONS = [
  { id: 'small', label: 'Small', description: '< 1 MP' },
  { id: 'medium', label: 'Medium', description: '1-4 MP' },
  { id: 'large', label: 'Large', description: '4+ MP' },
  { id: '4k', label: '4K+', description: '8+ MP' },
];

const STYLE_OPTIONS = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
  { id: 'vibrant', label: 'Vibrant' },
  { id: 'muted', label: 'Muted' },
  { id: 'monochrome', label: 'Monochrome' },
];

const MOOD_OPTIONS = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'energetic', label: 'Energetic' },
  { id: 'calm', label: 'Calm' },
  { id: 'dramatic', label: 'Dramatic' },
];

const FILE_TYPE_OPTIONS = [
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'document', label: 'Documents' },
  { id: 'design', label: 'Design Files' },
];

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'deployed', label: 'Deployed' },
  { id: 'archived', label: 'Archived' },
];

const DATE_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 3 Months' },
  { id: '1y', label: 'Last Year' },
];

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, icon, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

export function FilterSidebar({
  filters,
  onFiltersChange,
  collections,
  availableTags,
  activeFilterCount,
  onClearFilters,
}: FilterSidebarProps) {
  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K] extends string[] ? string : string,
    isArray: boolean = true
  ) => {
    if (isArray) {
      const currentArray = filters[key] as string[];
      const newArray = currentArray.includes(value as string)
        ? currentArray.filter((v) => v !== value)
        : [...currentArray, value as string];
      onFiltersChange({ ...filters, [key]: newArray });
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  return (
    <div className="w-64 bg-card border-r border-border h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-semibold">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="p-4 space-y-2">
          {/* Colors */}
          <FilterSection
            title="Colors"
            icon={<Palette className="h-4 w-4" />}
            defaultOpen
          >
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => updateFilter('colors', color.id)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                    filters.colors.includes(color.id)
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: color.color }}
                  title={color.label}
                />
              ))}
            </div>
          </FilterSection>

          {/* Size/Resolution */}
          <FilterSection
            title="Resolution"
            icon={<Maximize2 className="h-4 w-4" />}
          >
            {SIZE_OPTIONS.map((size) => (
              <label
                key={size.id}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <Checkbox
                  checked={filters.sizes.includes(size.id)}
                  onCheckedChange={() => updateFilter('sizes', size.id)}
                />
                <span className="text-sm group-hover:text-primary transition-colors">
                  {size.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {size.description}
                </span>
              </label>
            ))}
          </FilterSection>

          {/* Style */}
          <FilterSection
            title="Style"
            icon={<Sparkles className="h-4 w-4" />}
          >
            <div className="flex flex-wrap gap-1.5">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => updateFilter('styles', style.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full border transition-all",
                    filters.styles.includes(style.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Mood */}
          <FilterSection title="Mood" icon={<Heart className="h-4 w-4" />}>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => updateFilter('moods', mood.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full border transition-all",
                    filters.moods.includes(mood.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* File Type */}
          <FilterSection
            title="File Type"
            icon={<FileType className="h-4 w-4" />}
          >
            {FILE_TYPE_OPTIONS.map((type) => (
              <label
                key={type.id}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <Checkbox
                  checked={filters.fileTypes.includes(type.id)}
                  onCheckedChange={() => updateFilter('fileTypes', type.id)}
                />
                <span className="text-sm group-hover:text-primary transition-colors">
                  {type.label}
                </span>
              </label>
            ))}
          </FilterSection>

          {/* Collections */}
          {collections.length > 0 && (
            <FilterSection
              title="Collections"
              icon={<Folder className="h-4 w-4" />}
            >
              {collections.slice(0, 8).map((collection) => (
                <label
                  key={collection.id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <Checkbox
                    checked={filters.collections.includes(collection.id)}
                    onCheckedChange={() =>
                      updateFilter('collections', collection.id)
                    }
                  />
                  <span className="text-sm group-hover:text-primary transition-colors truncate">
                    {collection.name}
                  </span>
                </label>
              ))}
            </FilterSection>
          )}

          {/* Status */}
          <FilterSection
            title="Status"
            icon={<CheckCircle className="h-4 w-4" />}
          >
            {STATUS_OPTIONS.map((status) => (
              <label
                key={status.id}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <Checkbox
                  checked={filters.statuses.includes(status.id)}
                  onCheckedChange={() => updateFilter('statuses', status.id)}
                />
                <span className="text-sm group-hover:text-primary transition-colors">
                  {status.label}
                </span>
              </label>
            ))}
          </FilterSection>

          {/* Date Range */}
          <FilterSection
            title="Date Range"
            icon={<Calendar className="h-4 w-4" />}
          >
            {DATE_OPTIONS.map((date) => (
              <button
                key={date.id}
                onClick={() =>
                  onFiltersChange({ ...filters, dateRange: date.id })
                }
                className={cn(
                  "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                  filters.dateRange === date.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted"
                )}
              >
                {date.label}
              </button>
            ))}
          </FilterSection>

          {/* Tags */}
          {availableTags.length > 0 && (
            <FilterSection title="Tags" icon={<Tag className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.slice(0, 15).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => updateFilter('tags', tag)}
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-md border transition-all",
                      filters.tags.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
