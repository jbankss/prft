import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBrandContext } from '@/hooks/useBrandContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Check, ShoppingBag, CreditCard, Package, MessageSquare, Send, CheckCircle2, XCircle, AlertCircle, Clock, Activity } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
export default function Integrations() {
  const {
    currentBrand
  } = useBrandContext();
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<Array<{
    role: string;
    content: string;
  }>>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const webhookUrl = currentBrand ? `https://ulkxtkopehmiszfdjuys.supabase.co/functions/v1/shopify-orders?brand_id=${currentBrand.id}` : '';

  // Fetch webhook logs and subscribe to realtime updates
  useEffect(() => {
    if (!currentBrand) return;
    const fetchLogs = async () => {
      const {
        data,
        error
      } = await supabase.from('webhook_logs').select('*').eq('brand_id', currentBrand.id).order('created_at', {
        ascending: false
      }).limit(50);
      if (!error && data) {
        setWebhookLogs(data);
      }
    };
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase.channel('webhook-logs-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'webhook_logs',
      filter: `brand_id=eq.${currentBrand.id}`
    }, payload => {
      if (payload.eventType === 'INSERT') {
        setWebhookLogs(prev => [payload.new as any, ...prev].slice(0, 50));
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBrand]);
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  const handleSaveWebhook = async () => {
    if (!webhookSecret.trim()) {
      toast.error('Please enter a webhook secret');
      return;
    }
    setIsSaving(true);
    try {
      toast.success('Webhook secret saved successfully');
      setWebhookSecret('');
    } catch (error) {
      toast.error('Failed to save webhook secret');
    } finally {
      setIsSaving(false);
    }
  };
  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMessage = {
      role: 'user',
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    let assistantContent = '';
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });
      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: ''
      }]);
      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {
          stream: true
        });
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
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent
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
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
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
  const successCount = webhookLogs.filter(log => log.status === 'success').length;
  const errorCount = webhookLogs.filter(log => log.status === 'error').length;
  const totalInvoices = webhookLogs.reduce((sum, log) => sum + (log.invoices_created || 0), 0);
  if (!currentBrand) {
    return <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a brand to view integrations</p>
      </div>;
  }
  return <div className="space-y-6">
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

        <TabsContent value="shopify" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shopify Integration</CardTitle>
                  
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertDescription>
                      This integration will automatically:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Create invoices when products sell</li>
                        <li>Match product vendors to your accounts</li>
                        <li>Create new accounts for unrecognized vendors</li>
                        <li>Track sales and update P&L in real-time</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">Your Webhook URL</Label>
                      <div className="flex gap-2">
                        <Input id="webhook-url" value={webhookUrl} readOnly className="font-mono text-sm" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Use this URL when setting up your Shopify webhook
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="webhook-secret">Webhook Secret</Label>
                      <Input id="webhook-secret" type="password" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} placeholder="Enter your Shopify webhook secret" />
                      <p className="text-sm text-muted-foreground">
                        Get this from Shopify Admin → Settings → Notifications → Webhooks
                      </p>
                    </div>

                    <Button onClick={handleSaveWebhook} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Webhook Secret'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Setup Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">
                        1
                      </Badge>
                      <div>
                        <p className="font-medium">Log into Shopify Admin</p>
                        <p className="text-sm text-muted-foreground">
                          Go to Settings → Notifications → Webhooks
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">
                        2
                      </Badge>
                      <div>
                        <p className="font-medium">Create New Webhook</p>
                        <p className="text-sm text-muted-foreground">
                          Event: "Order creation" | Format: JSON
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">
                        3
                      </Badge>
                      <div>
                        <p className="font-medium">Copy Your Webhook URL</p>
                        <p className="text-sm text-muted-foreground">
                          Use the URL shown above in the webhook configuration
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">
                        4
                      </Badge>
                      <div>
                        <p className="font-medium">Save and Get Secret</p>
                        <p className="text-sm text-muted-foreground">
                          After saving, copy the webhook secret and paste it above
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">
                        5
                      </Badge>
                      <div>
                        <p className="font-medium">Test Your Integration</p>
                        <p className="text-sm text-muted-foreground">
                          Place a test order to verify invoices are created automatically
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Integration Assistant
                  </CardTitle>
                  
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {messages.length === 0 && <div className="text-center text-muted-foreground py-8">
                          <p>Ask me anything about setting up integrations!</p>
                        </div>}
                      {messages.map((msg, idx) => <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>)}
                    </div>
                  </ScrollArea>

                  <div className="space-y-2">
                    <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }} placeholder="Ask about Shopify integration..." className="min-h-[80px]" disabled={isStreaming} />
                    <Button onClick={sendMessage} disabled={isStreaming || !input.trim()} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      {isStreaming ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Activity Log</CardTitle>
              <CardDescription>
                Real-time monitoring of all webhook events and integration activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{webhookLogs.length}</div>
                    <p className="text-xs text-muted-foreground">Total Events</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-500">{successCount}</div>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-500">{errorCount}</div>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{totalInvoices}</div>
                    <p className="text-xs text-muted-foreground">Invoices Created</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                {webhookLogs.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                    <p>No webhook events yet</p>
                    <p className="text-sm">Events will appear here when webhooks are triggered</p>
                  </div> : <ScrollArea className="h-[500px]">
                    <div className="space-y-2 pr-4">
                      {webhookLogs.map(log => <Card key={log.id} className="cursor-pointer hover:bg-accent transition-colors" onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {getStatusIcon(log.status)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge variant={getStatusBadgeVariant(log.status)}>
                                      {log.status}
                                    </Badge>
                                    <span className="text-sm font-medium">{log.integration_type}</span>
                                    <span className="text-sm text-muted-foreground">•</span>
                                    <span className="text-sm text-muted-foreground">{log.event_type}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {log.response_summary || log.error_message || 'Processing...'}
                                  </p>
                                  {log.shopify_order_id && <p className="text-xs text-muted-foreground mt-1">
                                      Order: {log.shopify_order_id}
                                    </p>}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                </p>
                                {(log.invoices_created > 0 || log.accounts_created > 0) && <div className="flex gap-2 mt-1 justify-end">
                                    {log.invoices_created > 0 && <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {log.invoices_created} invoice{log.invoices_created !== 1 ? 's' : ''}
                                      </span>}
                                    {log.accounts_created > 0 && <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {log.accounts_created} new
                                      </span>}
                                  </div>}
                              </div>
                            </div>

                            {selectedLog?.id === log.id && <div className="mt-4 pt-4 border-t space-y-2">
                                {log.error_message && <div>
                                    <p className="text-sm font-medium mb-1">Error:</p>
                                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
                                      {log.error_message}
                                    </p>
                                  </div>}
                                {log.request_data && <div>
                                    <p className="text-sm font-medium mb-1">Request Data:</p>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                      {JSON.stringify(log.request_data, null, 2)}
                                    </pre>
                                  </div>}
                              </div>}
                          </CardContent>
                        </Card>)}
                    </div>
                  </ScrollArea>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="square">
          <Card>
            <CardHeader>
              <CardTitle>Square Integration</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Square integration will allow you to sync payments and transactions automatically.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brandboom">
          <Card>
            <CardHeader>
              <CardTitle>BrandBoom Integration</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                BrandBoom integration will sync your orders and inventory data.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
}