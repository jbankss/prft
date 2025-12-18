import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
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
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Package,
  Users,
  FileText,
  XCircle
} from 'lucide-react';
import { format, subDays, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  brandId: string;
  shopDomain: string | null;
  lastSuccessfulWebhook: string | null;
  onReconfigure: () => void;
}

interface ImportProgress {
  id: string;
  status: string;
  total_orders: number;
  orders_processed: number;
  invoices_created: number;
  accounts_created: number;
  skipped: number;
  errors: number;
  error_details: string[];
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

type DatePreset = 'last30' | 'last90' | 'ytd' | 'custom';

export function ConnectionStatus({ 
  brandId, 
  shopDomain, 
  lastSuccessfulWebhook,
  onReconfigure 
}: ConnectionStatusProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('last30');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  // Subscribe to real-time progress updates
  useEffect(() => {
    if (!brandId || !isImporting) return;

    const channel = supabase
      .channel('import-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'import_progress',
          filter: `brand_id=eq.${brandId}`
        },
        (payload) => {
          if (payload.new) {
            const progress = payload.new as ImportProgress;
            setImportProgress(progress);
            
            if (progress.status === 'completed' || progress.status === 'completed_with_errors') {
              setIsImporting(false);
              if (progress.status === 'completed') {
                toast.success(`Import complete: ${progress.invoices_created} invoices, ${progress.accounts_created} accounts created`);
              } else {
                toast.warning(`Import completed with ${progress.errors} errors`);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId, isImporting]);

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
    setImportProgress(null);

    try {
      const fromDate = getFromDate();
      
      const { data, error } = await supabase.functions.invoke('import-shopify-orders', {
        body: { 
          brand_id: brandId,
          from_date: format(fromDate, 'yyyy-MM-dd')
        }
      });

      if (error) {
        throw error;
      }

      // Function completed (may have updated progress already)
      if (!data.success) {
        toast.error(data.error || 'Import failed');
        setIsImporting(false);
      }
    } catch (error) {
      console.error('Error importing orders:', error);
      toast.error('Failed to import orders');
      setIsImporting(false);
    }
  };

  const presets = [
    { value: 'last30', label: 'Last 30 days' },
    { value: 'last90', label: 'Last 90 days' },
    { value: 'ytd', label: 'Year to date' },
    { value: 'custom', label: 'Custom date' },
  ];

  const getProgressPercent = () => {
    if (!importProgress || !importProgress.total_orders) return 0;
    return Math.round((importProgress.orders_processed / importProgress.total_orders) * 100);
  };

  const getStatusIcon = () => {
    if (!importProgress) return <Loader2 className="h-4 w-4 animate-spin" />;
    
    switch (importProgress.status) {
      case 'starting':
      case 'fetching_orders':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'completed_with_errors':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusText = () => {
    if (!importProgress) return 'Starting import...';
    
    switch (importProgress.status) {
      case 'starting':
        return 'Initializing...';
      case 'fetching_orders':
        return 'Fetching orders from Shopify...';
      case 'processing':
        return `Processing order ${importProgress.orders_processed} of ${importProgress.total_orders}...`;
      case 'completed':
        return 'Import complete!';
      case 'completed_with_errors':
        return `Completed with ${importProgress.errors} errors`;
      default:
        return 'Processing...';
    }
  };

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
            Pull past orders from your Shopify store. Duplicates are automatically skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Real-time Progress Display */}
          {isImporting && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="font-medium">{getStatusText()}</span>
              </div>
              
              {importProgress && importProgress.total_orders > 0 && (
                <>
                  <Progress value={getProgressPercent()} className="h-2" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-background rounded">
                      <Package className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium">{importProgress.orders_processed}</div>
                        <div className="text-xs text-muted-foreground">Orders</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-background rounded">
                      <FileText className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium">{importProgress.invoices_created}</div>
                        <div className="text-xs text-muted-foreground">Invoices</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-background rounded">
                      <Users className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="font-medium">{importProgress.accounts_created}</div>
                        <div className="text-xs text-muted-foreground">Accounts</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-background rounded">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{importProgress.skipped}</div>
                        <div className="text-xs text-muted-foreground">Skipped</div>
                      </div>
                    </div>
                  </div>

                  {importProgress.errors > 0 && importProgress.error_details && (
                    <div className="p-2 bg-destructive/10 rounded text-sm">
                      <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                        <AlertCircle className="h-4 w-4" />
                        {importProgress.errors} errors
                      </div>
                      <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                        {importProgress.error_details.slice(0, 3).map((err, i) => (
                          <div key={i}>{err}</div>
                        ))}
                        {importProgress.error_details.length > 3 && (
                          <div>...and {importProgress.error_details.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Date Presets - hide during import */}
          {!isImporting && (
            <>
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
            </>
          )}

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
                Importing...
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
