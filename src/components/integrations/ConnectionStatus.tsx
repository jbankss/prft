import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Check, 
  CalendarIcon, 
  Download, 
  Loader2, 
  Settings,
  Store,
  Activity,
  RefreshCw
} from 'lucide-react';
import { format, subDays, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  brandId: string;
  shopDomain: string | null;
  lastSuccessfulWebhook: string | null;
  onReconfigure: () => void;
}

type DatePreset = 'last30' | 'last90' | 'ytd' | 'custom';

export function ConnectionStatus({ 
  brandId, 
  shopDomain, 
  lastSuccessfulWebhook,
  onReconfigure 
}: ConnectionStatusProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('last30');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  const getFromDate = (): Date => {
    const today = new Date();
    switch (selectedPreset) {
      case 'last30':
        return subDays(today, 30);
      case 'last90':
        return subDays(today, 90);
      case 'ytd':
        return startOfYear(today);
      case 'custom':
        return customDate || subDays(today, 30);
      default:
        return subDays(today, 30);
    }
  };

  const handleImportOrders = async () => {
    setIsImporting(true);
    setImportProgress('Starting import...');

    try {
      const fromDate = getFromDate();
      
      const { data, error } = await supabase.functions.invoke('import-shopify-orders', {
        body: { 
          brand_id: brandId,
          from_date: format(fromDate, 'yyyy-MM-dd')
        }
      });

      if (error) throw error;

      if (data.success) {
        setImportProgress(null);
        toast.success(
          `Imported ${data.invoices_created || 0} invoices from ${data.orders_processed || 0} orders`
        );
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error importing orders:', error);
      toast.error('Failed to import orders');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const presets = [
    { value: 'last30', label: 'Last 30 days' },
    { value: 'last90', label: 'Last 90 days' },
    { value: 'ytd', label: 'Year to date' },
    { value: 'custom', label: 'Custom date' },
  ];

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Store className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Shopify Connected
                  <Badge variant="default" className="bg-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {shopDomain || 'Your store is connected'}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onReconfigure}>
              <Settings className="h-4 w-4 mr-2" />
              Reconfigure
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>
                {lastSuccessfulWebhook 
                  ? `Last order: ${lastSuccessfulWebhook}`
                  : 'Waiting for orders...'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Historical Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import Historical Orders
          </CardTitle>
          <CardDescription>
            Pull past orders from your Shopify store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Presets */}
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={selectedPreset === preset.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPreset(preset.value as DatePreset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Picker */}
          {selectedPreset === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !customDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDate ? format(customDate, "PPP") : "Pick a start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDate}
                  onSelect={setCustomDate}
                  initialFocus
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Import Summary */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Will import orders from{' '}
              <strong className="text-foreground">
                {format(getFromDate(), 'MMM d, yyyy')}
              </strong>{' '}
              to today
            </p>
          </div>

          {/* Import Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleImportOrders}
            disabled={isImporting || (selectedPreset === 'custom' && !customDate)}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {importProgress || 'Importing...'}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Import Orders
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
