import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  Search,
  Trash2,
  Wrench
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

interface ScanResult {
  total_orders: number;
  new_orders: number;
  existing_orders: number;
}

type DatePreset = 'last30' | 'last90' | 'ytd' | 'custom';

export function ConnectionStatus({ 
  brandId, 
  shopDomain, 
  lastSuccessfulWebhook,
  onReconfigure 
}: ConnectionStatusProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('last30');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  // Subscribe to real-time progress updates
  useEffect(() => {
    if (!brandId) return;

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
              setIsRepairing(false);
              setScanResult(null); // Reset scan after import
              if (progress.status === 'completed') {
                toast.success(`Import complete: ${progress.invoices_created} invoices, ${progress.accounts_created} new accounts`);
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
  }, [brandId]);

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

  const handleScanOrders = async () => {
    setIsScanning(true);
    setScanResult(null);

    try {
      const fromDate = getFromDate();
      
      const { data, error } = await supabase.functions.invoke('import-shopify-orders', {
        body: { 
          brand_id: brandId,
          from_date: format(fromDate, 'yyyy-MM-dd'),
          mode: 'scan'
        }
      });

      if (error) throw error;

      if (data.success) {
        setScanResult({
          total_orders: data.total_orders,
          new_orders: data.new_orders,
          existing_orders: data.existing_orders
        });
        
        if (data.new_orders === 0) {
          toast.info('All orders in this date range are already imported');
        } else {
          toast.success(`Found ${data.new_orders} new orders to import`);
        }
      } else {
        toast.error(data.error || 'Scan failed');
      }
    } catch (error) {
      console.error('Error scanning orders:', error);
      toast.error('Failed to scan orders');
    } finally {
      setIsScanning(false);
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
          from_date: format(fromDate, 'yyyy-MM-dd'),
          mode: 'import'
        }
      });

      if (error) throw error;

      if (!data.success && !data.progress_id) {
        toast.error(data.error || 'Import failed');
        setIsImporting(false);
      } else {
        toast.info('Import started in background. You can leave this page.');
      }
    } catch (error) {
      console.error('Error importing orders:', error);
      toast.error('Failed to start import');
      setIsImporting(false);
    }
  };

  const handleRepairOrders = async () => {
    setIsRepairing(true);
    setImportProgress(null);
    setScanResult(null);

    try {
      const fromDate = getFromDate();
      
      const { data, error } = await supabase.functions.invoke('import-shopify-orders', {
        body: { 
          brand_id: brandId,
          from_date: format(fromDate, 'yyyy-MM-dd'),
          mode: 'import',
          repair: true
        }
      });

      if (error) throw error;

      if (!data.success && !data.progress_id) {
        toast.error(data.error || 'Repair failed');
        setIsRepairing(false);
      } else {
        toast.info('Repair started. Existing Shopify data will be cleared and re-imported.');
      }
    } catch (error) {
      console.error('Error repairing orders:', error);
      toast.error('Failed to start repair');
      setIsRepairing(false);
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
    if (!importProgress) return isRepairing ? 'Clearing existing data...' : 'Starting import...';
    
    switch (importProgress.status) {
      case 'starting':
        return isRepairing ? 'Preparing repair...' : 'Initializing...';
      case 'fetching_orders':
        return 'Fetching orders from Shopify...';
      case 'processing':
        return `Processing order ${importProgress.orders_processed} of ${importProgress.total_orders}...`;
      case 'completed':
        return isRepairing ? 'Repair complete!' : 'Import complete!';
      case 'completed_with_errors':
        return `Completed with ${importProgress.errors} errors`;
      default:
        return 'Processing...';
    }
  };

  const isProcessing = isImporting || isRepairing;

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
            Scan and import past orders from your Shopify store. The import runs in the background.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Real-time Progress Display */}
          {isProcessing && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="font-medium">{getStatusText()}</span>
              </div>
              
              {importProgress && importProgress.total_orders > 0 && (
                <>
                  <Progress value={getProgressPercent()} className="h-2" />
                  
                  <div className="grid grid-cols-3 gap-3 text-sm">
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
                        <div className="text-xs text-muted-foreground">New Accounts</div>
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
                        {(importProgress.error_details as unknown as string[]).slice(0, 3).map((err, i) => (
                          <div key={i}>{err}</div>
                        ))}
                        {(importProgress.error_details as unknown as string[]).length > 3 && (
                          <div>...and {(importProgress.error_details as unknown as string[]).length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <p className="text-xs text-muted-foreground">
                You can leave this page. The import will continue in the background.
              </p>
            </div>
          )}

          {/* Date Presets - hide during import */}
          {!isProcessing && (
            <>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={selectedPreset === preset.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedPreset(preset.value as DatePreset);
                      setScanResult(null); // Reset scan when date changes
                    }}
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
                      onSelect={(date) => {
                        setCustomDate(date);
                        setScanResult(null); // Reset scan when date changes
                      }}
                      initialFocus
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {/* Import Summary */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Date range:{' '}
                  <strong className="text-foreground">
                    {format(getFromDate(), 'MMM d, yyyy')}
                  </strong>{' '}
                  to today
                </p>
              </div>

              {/* Scan Results */}
              {scanResult && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                    <Search className="h-4 w-4" />
                    Scan Results
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-bold text-lg">{scanResult.total_orders}</div>
                      <div className="text-xs text-muted-foreground">Total Orders</div>
                    </div>
                    <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                      <div className="font-bold text-lg text-green-600 dark:text-green-400">{scanResult.new_orders}</div>
                      <div className="text-xs text-muted-foreground">New Orders</div>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-bold text-lg">{scanResult.existing_orders}</div>
                      <div className="text-xs text-muted-foreground">Already Imported</div>
                    </div>
                  </div>
                  {scanResult.new_orders > 0 && (
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Click "Import Orders" to import {scanResult.new_orders} new orders.
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1" 
                  onClick={handleScanOrders}
                  disabled={isScanning || (selectedPreset === 'custom' && !customDate)}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Scan Orders
                    </>
                  )}
                </Button>
                
                <Button 
                  className="flex-1" 
                  onClick={handleImportOrders}
                  disabled={isScanning || (selectedPreset === 'custom' && !customDate) || (scanResult && scanResult.new_orders === 0)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import Orders
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Repair Orders Card */}
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Wrench className="h-5 w-5" />
            Repair Orders
          </CardTitle>
          <CardDescription>
            Clear all Shopify-imported data and re-import from scratch. Use this to fix data inconsistencies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Repair Orders
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Repair Orders?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>This will:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Delete all Shopify-imported invoices for this brand</li>
                    <li>Re-import orders from {format(getFromDate(), 'MMM d, yyyy')} to today</li>
                    <li>Correctly map all order dates and data</li>
                  </ul>
                  <p className="font-medium mt-3">This cannot be undone. Make sure to backup your data first if needed.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleRepairOrders}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Yes, Repair Orders
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
