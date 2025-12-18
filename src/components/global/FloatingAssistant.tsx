import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AssistantAvatar } from './AssistantAvatar';
import { useBrandContext } from '@/hooks/useBrandContext';
import { 
  X, 
  Send, 
  Sparkles, 
  History, 
  Trash2,
  ChevronDown,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const STORAGE_KEY = 'enzo-assistant-history';
const MAX_HISTORY = 50;

const suggestions = [
  { label: 'Import orders', message: 'How do I import orders from Shopify?' },
  { label: 'View analytics', message: 'Show me my sales analytics' },
  { label: 'Manage accounts', message: 'How do I manage vendor accounts?' },
  { label: 'Get help', message: 'What can you help me with?' },
];

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentBrand } = useBrandContext();
  const location = useLocation();

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: Message) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (e) {
        console.error('Failed to parse assistant history:', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    return path.slice(1).charAt(0).toUpperCase() + path.slice(2);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('system-assistant', {
        body: {
          messages: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })).concat({ role: 'user', content: messageText }),
          context: {
            brandName: currentBrand?.name,
            currentPage: getCurrentPage()
          }
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I could not process your request.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Assistant error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 transition-all duration-300',
          'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full',
          isOpen && 'scale-0 opacity-0'
        )}
      >
        <AssistantAvatar size="lg" isThinking={isLoading} />
      </button>

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 transition-all duration-300 transform',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        )}
      >
        <Card className="w-[380px] h-[500px] flex flex-col shadow-2xl border-primary/20">
          {/* Header */}
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AssistantAvatar size="sm" isThinking={isLoading} />
                <div>
                  <CardTitle className="text-base">Enzo Assistant</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {currentBrand?.name || 'Ready to help'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* History Panel */}
            {showHistory ? (
              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">Conversation History</h3>
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="h-7 text-xs">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No conversation history
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {messages.filter(m => m.role === 'user').slice(-10).map((msg, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            sendMessage(msg.content);
                            setShowHistory(false);
                          }}
                          className="w-full text-left p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm truncate"
                        >
                          {msg.content}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <Button 
                  variant="outline" 
                  className="mt-3" 
                  onClick={() => setShowHistory(false)}
                >
                  Back to Chat
                </Button>
              </div>
            ) : (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 px-4">
                  {messages.length === 0 ? (
                    <div className="py-8 text-center">
                      <Sparkles className="h-8 w-8 text-primary/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        How can I help you today?
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {suggestions.map((s, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => handleSuggestionClick(s.message)}
                          >
                            {s.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 space-y-4">
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex gap-2',
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {msg.role === 'assistant' && (
                            <AssistantAvatar size="sm" className="flex-shrink-0" />
                          )}
                          <div
                            className={cn(
                              'rounded-lg px-3 py-2 max-w-[80%] text-sm',
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-2">
                          <AssistantAvatar size="sm" isThinking className="flex-shrink-0" />
                          <div className="bg-muted rounded-lg px-3 py-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t flex-shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage(input);
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask me anything..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
