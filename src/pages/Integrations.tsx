import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBrandContext } from '@/hooks/useBrandContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Check, ShoppingBag, CreditCard, Package, MessageSquare, Send, CheckCircle2, XCircle, AlertCircle, Clock, Activity, Zap } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';

type Message = { role: string; content: string };
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [shopDomain, setShopDomain] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [lastSuccessfulWebhook, setLastSuccessfulWebhook] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const webhookUrl = currentBrand
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-orders?brand_id=${currentBrand.id}`
    : '';

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
        
        // Find last successful webhook
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
        setIsConfigured(integration.is_active && !!integration.webhook_secret);
        setShopDomain(integration.shop_domain || '');
        setWebhookSecret(''); // Don't show the actual secret
      } else {
        setIsConfigured(false);
        setShopDomain('');
        setWebhookSecret('');
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

  const handleSaveIntegration = async () => {
    if (!currentBrand || !webhookSecret.trim()) {
      toast.error('Please enter a webhook secret');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('brand_integrations')
        .upsert({
          brand_id: currentBrand.id,
          integration_type: 'shopify',
          webhook_secret: webhookSecret,
          shop_domain: shopDomain || null,
          is_active: true,
        }, {
          onConflict: 'brand_id,integration_type'
        });

      if (error) throw error;

      toast.success('Shopify integration configured successfully');
      setIsConfigured(true);
      setWebhookSecret(''); // Clear the input for security
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error('Failed to save integration configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleTestWebhook = async () => {
    if (!currentBrand) {
      toast.error('Please select a brand first');
      return;
    }

    if (!isConfigured) {
      toast.error('Please configure your Shopify integration first');
      return;
    }

    try {
      toast.info('Sending test webhook...');
      
      const { data, error } = await supabase.functions.invoke('test-shopify-webhook', {
        body: { brand_id: currentBrand.id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Test webhook sent successfully! Check the Activity Log below.');
      } else {
        toast.error(data.error || 'Test webhook failed');
      }
    } catch (error) {
      console.error('Error sending test webhook:', error);
      toast.error('Failed to send test webhook');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;

        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get response from assistant');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Shopify Integration
              </CardTitle>
              <CardDescription>
                Connect your Shopify store to automatically create invoices from orders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 p-4 rounded-lg ${
                isConfigured ? 'bg-green-50 dark:bg-green-950' : 'bg-amber-50 dark:bg-amber-950'
              }`}>
                <div className={`h-2 w-2 rounded-full ${
                  isConfigured ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                }`} />
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    {isConfigured ? 'Integration Active' : 'Not Configured'}
                  </span>
                  {lastSuccessfulWebhook && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last successful order: {lastSuccessfulWebhook}
                    </p>
                  )}
                </div>
              </div>

              {/* Configuration Form */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm">Integration Settings</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook Signing Secret *</label>
                  <Input
                    type="password"
                    placeholder="Enter your Shopify webhook signing secret"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in Shopify Admin → Settings → Notifications → Webhooks (at the bottom)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Shop Domain (Optional)</label>
                  <Input
                    placeholder="your-store.myshopify.com"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Shopify store URL for reference
                  </p>
                </div>

                <Button 
                  onClick={handleSaveIntegration}
                  disabled={isSaving || !webhookSecret.trim()}
                  className="w-full"
                >
                  {isSaving ? 'Saving...' : isConfigured ? 'Update Integration' : 'Save Integration'}
                </Button>
              </div>

              {/* Setup Instructions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Setup Instructions</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Go to Shopify Admin:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>Settings → Notifications → Webhooks section</li>
                    </ul>
                  </li>
                  <li>
                    <strong className="text-foreground">Create Webhook:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li>Click "Create webhook"</li>
                      <li>Event: <code className="bg-muted px-1 py-0.5 rounded">Order creation</code></li>
                      <li>Format: <code className="bg-muted px-1 py-0.5 rounded">JSON</code></li>
                      <li>URL: Copy from the "Webhook URL" field below</li>
                    </ul>
                  </li>
                  <li>
                    <strong className="text-foreground">Copy Webhook Signing Secret:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>After creating webhook, find the signing secret at bottom of webhooks page</li>
                      <li>Paste it in the "Webhook Signing Secret" field above</li>
                    </ul>
                  </li>
                  <li>
                    <strong className="text-foreground">Save & Test:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>Click "Save Integration" above</li>
                      <li>Use "Send Test Webhook" button to verify</li>
                      <li>Check Activity Log for results</li>
                    </ul>
                  </li>
                </ol>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this URL and paste it in Shopify webhook settings
                </p>
              </div>

              {/* Test Webhook */}
              <div className="pt-4 border-t">
                <Button
                  onClick={handleTestWebhook}
                  variant="outline"
                  className="w-full"
                  disabled={!isConfigured}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Webhook
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {isConfigured 
                    ? 'Simulates a Shopify order to test your integration' 
                    : 'Configure integration first to test'}
                </p>
              </div>

              {/* Integration Assistant */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Integration Assistant
                </h3>
                <ScrollArea className="h-[300px] border rounded-lg p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <p>Ask me anything about setting up Shopify integration!</p>
                      </div>
                    )}
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="flex gap-2 mt-4">
                  <Textarea
                    placeholder="Ask about Shopify integration..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="min-h-[60px]"
                  />
                  <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-6">
          {/* Warning Banner for Errors */}
          {webhookLogs.some(log => log.status === 'error' && log.error_message?.includes('brand_id')) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Webhook Configuration Issue Detected</AlertTitle>
              <AlertDescription>
                Recent webhooks are failing because the webhook URL is missing the brand_id parameter. 
                Make sure you're using the complete webhook URL from the Shopify tab, including the brand_id query parameter.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Webhook Activity Log</CardTitle>
              <CardDescription>
                Monitor incoming webhooks and their processing status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{webhookLogs.length}</p>
                      <p className="text-sm text-muted-foreground">Total Events</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{successCount}</p>
                      <p className="text-sm text-muted-foreground">Successful</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Webhook Logs */}
              <div className="space-y-2">
                {webhookLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No webhook events yet</p>
                  </div>
                ) : (
                  webhookLogs.map((log) => (
                    <Collapsible key={log.id}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-3 flex-1">
                          {getStatusIcon(log.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {log.event_type} #{log.shopify_order_id}
                              </p>
                              <Badge variant={getStatusBadgeVariant(log.status)}>
                                {log.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {format(new Date(log.created_at), 'PPpp')}
                            </p>
                            {log.response_summary && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {log.response_summary}
                              </p>
                            )}
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <div className="p-4 bg-muted/50 border-x border-b rounded-b-lg space-y-4">
                          {log.error_message && (
                            <div>
                              <p className="text-sm font-medium text-red-600">Error:</p>
                              <p className="text-xs font-mono bg-red-50 dark:bg-red-950 p-2 rounded mt-1">
                                {log.error_message}
                              </p>
                            </div>
                          )}
                          {log.request_data && (
                            <div>
                              <p className="text-sm font-medium">Request Data:</p>
                              <pre className="text-xs font-mono bg-background p-2 rounded mt-1 overflow-auto max-h-40">
                                {JSON.stringify(log.request_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Invoices Created:</span>
                              <span className="ml-2 font-medium">{log.invoices_created || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Accounts Created:</span>
                              <span className="ml-2 font-medium">{log.accounts_created || 0}</span>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Square Tab (Coming Soon) */}
        <TabsContent value="square">
          <Card>
            <CardHeader>
              <CardTitle>Square Integration</CardTitle>
              <CardDescription>Coming Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Square integration will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BrandBoom Tab (Coming Soon) */}
        <TabsContent value="brandboom">
          <Card>
            <CardHeader>
              <CardTitle>BrandBoom Integration</CardTitle>
              <CardDescription>Coming Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                BrandBoom integration will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}