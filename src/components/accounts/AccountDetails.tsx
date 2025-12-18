import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Send, FileText, DollarSign, Package, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { InvoicesList } from './InvoicesList';
import { ChargesList } from './ChargesList';

export function AccountDetails({
  accountId,
  onClose,
  onRefresh,
}: {
  accountId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const [account, setAccount] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Balance editing state
  const [editingBalance, setEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [newBalanceNotes, setNewBalanceNotes] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  useEffect(() => {
    if (!accountId) return;

    const fetchAccount = async () => {
      const { data } = await supabase
        .from('accounts')
        .select('*, brands(*)')
        .eq('id', accountId)
        .single();
      setAccount(data);
      if (data) {
        setNewBalance(String(data.manual_balance || 0));
        setNewBalanceNotes(data.balance_notes || '');
      }
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles(*)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };

    fetchAccount();
    fetchMessages();

    const messagesChannel = supabase
      .channel(`account-messages-${accountId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `account_id=eq.${accountId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('chat_messages')
              .select('*, profiles(*)')
              .eq('id', payload.new.id)
              .single();
            if (data) {
              setMessages((prev) => [...prev, data]);
            }
          }
        }
      )
      .subscribe();

    const accountChannel = supabase
      .channel(`account-${accountId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'accounts', filter: `id=eq.${accountId}` },
        fetchAccount
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(accountChannel);
    };
  }, [accountId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !accountId || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        account_id: accountId,
        user_id: user.id,
        message: newMessage,
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const saveBalance = async () => {
    if (!accountId) return;
    
    setSavingBalance(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          manual_balance: parseFloat(newBalance) || 0,
          balance_notes: newBalanceNotes || null,
        })
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Balance updated');
      setEditingBalance(false);
      onRefresh();
    } catch (error: any) {
      toast.error('Failed to update balance');
    } finally {
      setSavingBalance(false);
    }
  };

  if (!accountId) return null;

  return (
    <Sheet open={!!accountId} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-2xl">
            {account?.account_name || 'Account Details'}
          </SheetTitle>
          {account?.brands && (
            <p className="text-sm text-muted-foreground">{account.brands.name}</p>
          )}
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Side Navigation */}
          <div className="w-16 border-r bg-muted/30 flex flex-col items-center py-4 gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg"
              onClick={() => document.getElementById('tab-overview')?.click()}
            >
              <Package className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg"
              onClick={() => document.getElementById('tab-chat')?.click()}
            >
              <FileText className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg"
              onClick={() => document.getElementById('tab-charges')?.click()}
            >
              <DollarSign className="h-5 w-5" />
            </Button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6">
                <TabsTrigger value="overview" id="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="chat" id="tab-chat">Chat</TabsTrigger>
                <TabsTrigger value="charges" id="tab-charges">Charges</TabsTrigger>
                <TabsTrigger value="invoices" id="tab-invoices">Invoices</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="overview" className="h-full m-0 p-6 overflow-auto">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                        <CardDescription>Vendor account details and balance</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className="font-medium capitalize">{account?.status || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="font-medium">
                              {account?.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        {account?.notes && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm">{account.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Amount Owed Card - Editable */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Amount Owed</CardTitle>
                          <CardDescription>
                            How much you owe this vendor for inventory (counts against P&L)
                          </CardDescription>
                        </div>
                        {!editingBalance && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingBalance(true)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        {editingBalance ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="manual_balance">Amount Owed ($)</Label>
                              <Input
                                id="manual_balance"
                                type="number"
                                step="0.01"
                                min="0"
                                value={newBalance}
                                onChange={(e) => setNewBalance(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="balance_notes">Notes</Label>
                              <Input
                                id="balance_notes"
                                value={newBalanceNotes}
                                onChange={(e) => setNewBalanceNotes(e.target.value)}
                                placeholder="e.g., PO #12345, Due on 12/30"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={saveBalance} 
                                disabled={savingBalance}
                                size="sm"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingBalance(false);
                                  setNewBalance(String(account?.manual_balance || 0));
                                  setNewBalanceNotes(account?.balance_notes || '');
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-3xl font-bold text-destructive">
                              ${Number(account?.manual_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            {account?.balance_notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {account.balance_notes}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="chat" className="h-full m-0 flex flex-col">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div key={msg.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={msg.profiles?.avatar_url || ''} />
                              <AvatarFallback>
                                {msg.profiles?.full_name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {msg.profiles?.full_name || 'User'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(msg.created_at).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              <p className="text-sm bg-muted/50 rounded-lg px-3 py-2">
                                {msg.message}
                              </p>
                            </div>
                          </div>
                        ))}
                        {messages.length === 0 && (
                          <div className="text-center py-12">
                            <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                          disabled={loading}
                        />
                        <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="invoices" className="h-full m-0 p-6 overflow-auto">
                  <InvoicesList accountId={accountId} onRefresh={onRefresh} />
                </TabsContent>

                <TabsContent value="charges" className="h-full m-0 p-6 overflow-auto">
                  <ChargesList accountId={accountId} onRefresh={onRefresh} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
