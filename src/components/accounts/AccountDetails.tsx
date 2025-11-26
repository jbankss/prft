import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
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

  useEffect(() => {
    if (!accountId) return;

    const fetchAccount = async () => {
      const { data } = await supabase
        .from('accounts')
        .select('*, brands(*)')
        .eq('id', accountId)
        .single();
      setAccount(data);
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

    const channel = supabase
      .channel(`account-${accountId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `account_id=eq.${accountId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  if (!accountId) return null;

  return (
    <Sheet open={!!accountId} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl glass">
        <SheetHeader>
          <SheetTitle className="text-2xl">
            {account?.account_name || 'Account Details'}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="chat" className="mt-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="charges">Charges</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <Card className="h-[60vh] flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {msg.profiles?.full_name || 'User'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t flex gap-2">
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
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <InvoicesList accountId={accountId} onRefresh={onRefresh} />
          </TabsContent>

          <TabsContent value="charges" className="mt-4">
            <ChargesList accountId={accountId} onRefresh={onRefresh} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}