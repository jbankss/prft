import { useBrandContext } from '@/hooks/useBrandContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export function BrandSwitcher() {
  const {
    currentBrand,
    availableBrands,
    switchBrand,
    loading
  } = useBrandContext();
  if (loading || availableBrands.length === 0) {
    return null;
  }
  return <div className="flex items-center gap-2">
      
      <Select value={currentBrand?.id} onValueChange={switchBrand}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select store" />
        </SelectTrigger>
        <SelectContent>
          {availableBrands.map(brand => <SelectItem key={brand.id} value={brand.id}>
              {brand.name}
            </SelectItem>)}
        </SelectContent>
      </Select>
    </div>;
}