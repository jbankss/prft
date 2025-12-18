import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBrandContext } from '@/hooks/useBrandContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingBag, CreditCard, Package, Activity, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ShopifySetupWizard } from '@/components/integrations/ShopifySetupWizard';
import { ConnectionStatus } from '@/components/integrations/ConnectionStatus';

type WebhookLog = {
  id: string;
  brand_id: string;
  integration_type: string;
  event_type: string;
  status: string;
  request_data: any;
  response_summary: string | null;
  error_message: string | null;
  shopify_order_id: string | null;
  invoices_created: number | null;
  accounts_created: number | null;
  created_at: string;
};

export default function Integrations() {
  const { currentBrand } = useBrandContext();
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [shopDomain, setShopDomain] = useState<string | null>(null);
  const [lastSuccessfulWebhook, setLastSuccessfulWebhook] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!currentBrand) return;

    const fetchData = async () => {
      // Fetch webhook logs
      const { data: logs, error: logsError } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        console.error('Error fetching webhook logs:', logsError);
        toast.error('Failed to load webhook logs');
      } else {
        setWebhookLogs(logs || []);
        
        const lastSuccess = logs?.find(log => log.status === 'success');
        setLastSuccessfulWebhook(lastSuccess ? new Date(lastSuccess.created_at).toLocaleString() : null);
      }

      // Fetch integration config
      const { data: integration, error: integrationError } = await supabase
        .from('brand_integrations')
        .select('*')
        .eq('brand_id', currentBrand.id)
        .eq('integration_type', 'shopify')
        .maybeSingle();

      if (!integrationError && integration) {
        const fullyConfigured = integration.is_active && !!integration.webhook_secret && !!integration.api_access_token;
        setIsConfigured(fullyConfigured);
        setShopDomain(integration.shop_domain || null);
        setShowWizard(!fullyConfigured);
      } else {
        setIsConfigured(false);
        setShopDomain(null);
        setShowWizard(true);
      }
    };

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('webhook_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webhook_logs',
          filter: `brand_id=eq.${currentBrand.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBrand]);

  const handleSetupComplete = () => {
    setIsConfigured(true);
    setShowWizard(false);
  };

  const handleReconfigure = () => {
    setShowWizard(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'skipped':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a brand to view integrations</p>
      </div>
    );
  }

  const successCount = webhookLogs.filter((log) => log.status === 'success').length;
  const errorCount = webhookLogs.filter((log) => log.status === 'error').length;
  const totalInvoices = webhookLogs.reduce((sum, log) => sum + (log.invoices_created || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
      </div>

      <Tabs defaultValue="shopify" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shopify">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Shopify
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="square" disabled>
            <CreditCard className="h-4 w-4 mr-2" />
            Square
          </TabsTrigger>
          <TabsTrigger value="brandboom" disabled>
            <Package className="h-4 w-4 mr-2" />
            BrandBoom
          </TabsTrigger>
        </TabsList>

        {/* Shopify Tab */}
        <TabsContent value="shopify" className="space-y-6">
          {showWizard ? (
            <ShopifySetupWizard 
              brandId={currentBrand.id} 
              onComplete={handleSetupComplete}
            />
          ) : (
            <ConnectionStatus
              brandId={currentBrand.id}
              shopDomain={shopDomain}
              lastSuccessfulWebhook={lastSuccessfulWebhook}
              onReconfigure={handleReconfigure}
            />
          )}
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{webhookLogs.length}</p>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{successCount}</p>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{errorCount}</p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Activity</CardTitle>
              <CardDescription>Recent webhook events from your integrations</CardDescription>
            </CardHeader>
            <CardContent>
              {webhookLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No webhook activity yet</p>
                  <p className="text-sm mt-1">Events will appear here when orders come in</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookLogs.map((log) => (
                      <Collapsible key={log.id} asChild>
                        <>
                          <CollapsibleTrigger asChild>
                            <TableRow className="cursor-pointer hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(log.status)}
                                  <Badge variant={getStatusBadgeVariant(log.status)}>
                                    {log.status}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{log.event_type}</p>
                                  <p className="text-xs text-muted-foreground">{log.integration_type}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm">{format(new Date(log.created_at), 'MMM d, h:mm a')}</p>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {log.response_summary || log.error_message || 'No details'}
                                </p>
                              </TableCell>
                            </TableRow>
                          </CollapsibleTrigger>
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={4} className="bg-muted/30">
                                <div className="p-4 space-y-2">
                                  {log.shopify_order_id && (
                                    <p className="text-sm">
                                      <strong>Order ID:</strong> {log.shopify_order_id}
                                    </p>
                                  )}
                                  {log.invoices_created !== null && (
                                    <p className="text-sm">
                                      <strong>Invoices Created:</strong> {log.invoices_created}
                                    </p>
                                  )}
                                  {log.accounts_created !== null && (
                                    <p className="text-sm">
                                      <strong>Accounts Created:</strong> {log.accounts_created}
                                    </p>
                                  )}
                                  {log.error_message && (
                                    <p className="text-sm text-red-600">
                                      <strong>Error:</strong> {log.error_message}
                                    </p>
                                  )}
                                  {log.response_summary && (
                                    <p className="text-sm">
                                      <strong>Summary:</strong> {log.response_summary}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Square Tab (Coming Soon) */}
        <TabsContent value="square">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Square Integration
              </CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Square integration is coming soon. Check back later!</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BrandBoom Tab (Coming Soon) */}
        <TabsContent value="brandboom">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                BrandBoom Integration
              </CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">BrandBoom integration is coming soon. Check back later!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
