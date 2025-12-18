import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Send, FileText, DollarSign, Package, Edit2, Check, X, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { InvoicesList } from './InvoicesList';
import { ChargesList } from './ChargesList';
import { logActivity } from '@/lib/activityLogger';

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

  // Create system message for account changes
  const createSystemMessage = async (message: string, action: string) => {
    if (!accountId || !user) return;
    
    try {
      await supabase.from('chat_messages').insert({
        account_id: accountId,
        user_id: user.id,
        message,
        is_system: true,
        system_action: action,
      });
    } catch (error) {
      console.error('Failed to create system message:', error);
    }
  };

  const saveBalance = async () => {
    if (!accountId || !user) return;
    
    setSavingBalance(true);
    try {
      const oldBalance = account?.manual_balance || 0;
      const newBalanceValue = parseFloat(newBalance) || 0;
      
      const { error } = await supabase
        .from('accounts')
        .update({
          manual_balance: newBalanceValue,
          balance_notes: newBalanceNotes || null,
        })
        .eq('id', accountId);

      if (error) throw error;

      // Get user profile for the system message
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      const userName = profile?.full_name || 'User';
      
      // Create system message about the change
      const changeMessage = `Amount owed updated from $${Number(oldBalance).toLocaleString()} to $${newBalanceValue.toLocaleString()} by ${userName}`;
      await createSystemMessage(changeMessage, 'balance_update');
      
      // Log to activity log
      await logActivity({
        action: 'updated',
        entityType: 'account',
        entityId: accountId,
        changes: {
          manual_balance: { from: oldBalance, to: newBalanceValue },
          balance_notes: { from: account?.balance_notes, to: newBalanceNotes },
        },
      });

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

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="charges">Charges</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="overview" className="h-full m-0 p-6 overflow-auto">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Information</CardTitle>
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

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Amount Owed</CardTitle>
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
                      {messages.map((msg) => {
                        const isSystem = msg.is_system;
                        
                        return (
                          <div key={msg.id} className={`flex gap-3 ${isSystem ? 'justify-center' : ''}`}>
                            {isSystem ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-full">
                                <Bot className="h-3 w-3" />
                                <span className="italic">{msg.message}</span>
                                <span className="text-muted-foreground/60">
                                  {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                                </span>
                              </div>
                            ) : (
                              <>
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
                                      {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                                    </span>
                                  </div>
                                  <p className="text-sm bg-muted/50 rounded-lg px-3 py-2">
                                    {msg.message}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
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
      </SheetContent>
    </Sheet>
  );
}
