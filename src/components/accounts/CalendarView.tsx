import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { DollarSign, FileText, Plus } from 'lucide-react';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'charge' | 'invoice' | 'account';
  title: string;
  amount?: number;
  accountName: string;
}

export function CalendarView({ brandId }: { brandId: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('calendar-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charges' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchEvents)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId]);

  const fetchEvents = async () => {
    try {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);

      // Fetch accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('brand_id', brandId);

      if (!accounts) return;

      const accountIds = accounts.map((a) => a.id);
      const allEvents: CalendarEvent[] = [];

      // Add account creation events
      accounts.forEach((account) => {
        allEvents.push({
          id: account.id,
          date: new Date(account.created_at),
          type: 'account',
          title: `Account Created: ${account.account_name}`,
          accountName: account.account_name,
        });
      });

      // Fetch charges
      const { data: charges } = await supabase
        .from('charges')
        .select('*, accounts(account_name)')
        .in('account_id', accountIds);

      charges?.forEach((charge) => {
        allEvents.push({
          id: charge.id,
          date: new Date(charge.charge_date),
          type: 'charge',
          title: charge.description,
          amount: Number(charge.amount),
          accountName: charge.accounts.account_name,
        });
      });

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, accounts(account_name)')
        .in('account_id', accountIds);

      invoices?.forEach((invoice) => {
        allEvents.push({
          id: invoice.id,
          date: new Date(invoice.created_at),
          type: 'invoice',
          title: `Invoice ${invoice.invoice_number}`,
          amount: Number(invoice.amount),
          accountName: invoice.accounts.account_name,
        });
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date));
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'charge':
        return <DollarSign className="h-4 w-4" />;
      case 'invoice':
        return <FileText className="h-4 w-4" />;
      case 'account':
        return <Plus className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'charge':
        return 'bg-red-500/10 text-red-500';
      case 'invoice':
        return 'bg-green-500/10 text-green-500';
      case 'account':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse h-96 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Activity Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
            modifiers={{
              hasEvents: (date) => getEventsForDate(date).length > 0,
            }}
            modifiersClassNames={{
              hasEvents: 'bg-primary/10 font-bold',
            }}
          />
        </CardContent>
      </Card>

      {/* Events for Selected Date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {format(selectedDate, 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedDateEvents.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg ${getEventColor(event.type)}`}
              >
                <div className="flex items-start gap-2">
                  {getEventIcon(event.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs opacity-80 mt-1">{event.accountName}</p>
                    {event.amount && (
                      <p className="text-sm font-semibold mt-1">
                        ${event.amount.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {selectedDateEvents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No events on this date
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
