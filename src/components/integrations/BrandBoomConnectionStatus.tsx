import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Package, 
  CheckCircle2, 
  RefreshCw, 
  Settings, 
  Clock,
  FileText,
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface BrandBoomConnectionStatusProps {
  brandId: string;
  onReconfigure: () => void;
}

interface SyncLog {
  id: string;
  status: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  records_synced: number | null;
  error_message: string | null;
}

export function BrandBoomConnectionStatus({ brandId, onReconfigure }: BrandBoomConnectionStatusProps) {
  const [integration, setIntegration] = useState<any>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({
    totalOrders: 0,
    totalInvoices: 0,
    totalAccounts: 0
  });

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('brandboom-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'brandboom_sync_logs',
        filter: `brand_id=eq.${brandId}`
      }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId]);

  const fetchData = async () => {
    // Fetch integration config
    const { data: integrationData } = await supabase
      .from('brand_integrations')
      .select('*')
      .eq('brand_id', brandId)
      .eq('integration_type', 'brandboom')
      .maybeSingle();

    setIntegration(integrationData);

    // Fetch recent sync logs
    const { data: logsData } = await supabase
      .from('brandboom_sync_logs')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5);

    setSyncLogs(logsData || []);

    // Fetch stats
    const { count: ordersCount } = await supabase
      .from('brandboom_orders')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId);

    const { count: invoicesCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'brandboom');

    const { count: accountsCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .ilike('notes', '%BrandBoom%');

    setSyncStats({
      totalOrders: ordersCount || 0,
      totalInvoices: invoicesCount || 0,
      totalAccounts: accountsCount || 0
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('brandboom-sync', {
        body: { 
          brandId,
          fromDate: integration?.import_from_date
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Sync complete: ${data.ordersProcessed} orders, ${data.invoicesCreated} invoices`);
        fetchData();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync with BrandBoom');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'completed_with_errors':
        return <Badge className="bg-amber-500">Completed with errors</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!integration) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Package className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  BrandBoom Connected
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </CardTitle>
                <CardDescription>
                  {integration.shop_domain === 'manage.brandboom.net' ? 'Sandbox' : 'Production'} environment
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onReconfigure}>
                <Settings className="h-4 w-4 mr-2" />
                Reconfigure
              </Button>
              <Button 
                size="sm" 
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Last Sync</span>
              </div>
              <p className="font-semibold">
                {integration.last_import_at 
                  ? format(new Date(integration.last_import_at), 'MMM d, h:mm a')
                  : 'Never'}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-sm">Orders Imported</span>
              </div>
              <p className="font-semibold">{syncStats.totalOrders}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Invoices Created</span>
              </div>
              <p className="font-semibold">{syncStats.totalInvoices}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Accounts Created</span>
              </div>
              <p className="font-semibold">{syncStats.totalAccounts}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sync History</CardTitle>
          <CardDescription>Recent synchronization activity</CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No sync history yet</p>
              <p className="text-sm mt-1">Click "Sync Now" to import orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {log.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : log.status === 'running' ? (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {log.sync_type === 'orders' ? 'Order Sync' : log.sync_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.started_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {log.records_synced !== null && (
                      <span className="text-sm text-muted-foreground">
                        {log.records_synced} records
                      </span>
                    )}
                    {getStatusBadge(log.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
