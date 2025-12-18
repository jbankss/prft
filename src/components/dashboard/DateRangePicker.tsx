import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, subDays, startOfMonth, startOfWeek, startOfYear, endOfDay, startOfDay } from 'date-fns';
import { DateRangeState } from '@/hooks/useDashboardMetrics';

interface DateRangePickerProps {
  value: DateRangeState;
  onChange: (range: DateRangeState) => void;
}

const presets = [
  { label: 'Today', getValue: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
  { label: 'Last 7 Days', getValue: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
  { label: 'Last 30 Days', getValue: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
  { label: 'This Week', getValue: () => ({ start: startOfWeek(new Date()), end: new Date() }) },
  { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'This Year', getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompOpen, setIsCompOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(!!value.comparison);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({
    from: value.start,
    to: value.end,
  });
  const [tempCompRange, setTempCompRange] = useState<{ from?: Date; to?: Date }>({
    from: value.comparison?.start,
    to: value.comparison?.end,
  });

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    setTempRange({ from: range.start, to: range.end });
    onChange({
      ...value,
      start: range.start,
      end: range.end,
    });
    setIsOpen(false);
  };

  const handleRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    setTempRange(range);
    if (range.from && range.to) {
      onChange({
        ...value,
        start: range.from,
        end: range.to,
      });
    }
  };

  const handleCompRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    setTempCompRange(range);
    if (range.from && range.to) {
      onChange({
        ...value,
        comparison: {
          start: range.from,
          end: range.to,
        },
      });
    }
  };

  const handleComparisonToggle = (enabled: boolean) => {
    setShowComparison(enabled);
    if (!enabled) {
      onChange({
        start: value.start,
        end: value.end,
        comparison: undefined,
      });
      setTempCompRange({});
    } else {
      // Default comparison: same length period before primary range
      const daysDiff = Math.round((value.end.getTime() - value.start.getTime()) / (1000 * 60 * 60 * 24));
      const compStart = subDays(value.start, daysDiff + 1);
      const compEnd = subDays(value.start, 1);
      setTempCompRange({ from: compStart, to: compEnd });
      onChange({
        ...value,
        comparison: { start: compStart, end: compEnd },
      });
    }
  };

  const formatDateRange = (start: Date, end: Date) => {
    return `${format(start, 'MMM dd')} – ${format(end, 'MMM dd, yyyy')}`;
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Primary Range Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[200px] justify-start">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{formatDateRange(value.start, value.end)}</span>
            <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets */}
            <div className="border-r p-2 space-y-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {/* Calendar */}
            <div className="p-3">
              <CalendarComponent
                mode="range"
                selected={{ from: tempRange.from, to: tempRange.to }}
                onSelect={handleRangeSelect}
                numberOfMonths={2}
                defaultMonth={subDays(new Date(), 30)}
              />
            </div>
          </div>
          {/* Comparison Toggle */}
          <div className="border-t p-3 flex items-center gap-2">
            <Switch
              id="compare-toggle"
              checked={showComparison}
              onCheckedChange={handleComparisonToggle}
            />
            <Label htmlFor="compare-toggle" className="text-sm text-muted-foreground">
              Compare to previous period
            </Label>
          </div>
        </PopoverContent>
      </Popover>

      {/* Comparison Range */}
      {showComparison && value.comparison && (
        <>
          <span className="text-sm text-muted-foreground">vs</span>
          <Popover open={isCompOpen} onOpenChange={setIsCompOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[200px] justify-start border-dashed">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatDateRange(value.comparison.start, value.comparison.end)}
                </span>
                <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: tempCompRange.from, to: tempCompRange.to }}
                onSelect={handleCompRangeSelect}
                numberOfMonths={2}
                defaultMonth={value.comparison.start}
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
