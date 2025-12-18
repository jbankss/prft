import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { DollarSign, FileText, Plus, TrendingUp, ShoppingCart } from 'lucide-react';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'charge' | 'order' | 'account';
  title: string;
  amount?: number;
  accountName: string;
}

export function ImprovedCalendarView({ brandId }: { brandId: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
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
  }, [brandId, currentMonth]);

  const fetchEvents = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

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
        const createdDate = new Date(account.created_at);
        if (createdDate >= start && createdDate <= end) {
          allEvents.push({
            id: account.id,
            date: createdDate,
            type: 'account',
            title: `Account Created: ${account.account_name}`,
            accountName: account.account_name,
          });
        }
      });

      // Fetch charges
      const { data: charges } = await supabase
        .from('charges')
        .select('*, accounts(account_name)')
        .in('account_id', accountIds)
        .gte('charge_date', start.toISOString())
        .lte('charge_date', end.toISOString());

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

      // Fetch orders (invoices) - use due_date for actual order date
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, accounts(account_name)')
        .in('account_id', accountIds);

      invoices?.forEach((invoice) => {
        // Use due_date (actual order date from Shopify) if available, otherwise created_at
        const orderDate = new Date(invoice.due_date || invoice.created_at);
        
        // Only include if order date is in current month
        if (orderDate >= start && orderDate <= end) {
          allEvents.push({
            id: invoice.id,
            date: orderDate,
            type: 'order',
            title: `Order ${invoice.invoice_number}`,
            amount: Number(invoice.amount),
            accountName: invoice.accounts.account_name,
          });
        }
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

  const getEventsByType = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    return {
      charges: dayEvents.filter(e => e.type === 'charge'),
      orders: dayEvents.filter(e => e.type === 'order'),
      accounts: dayEvents.filter(e => e.type === 'account'),
    };
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'charge':
        return DollarSign;
      case 'order':
        return ShoppingCart;
      case 'account':
        return Plus;
      default:
        return TrendingUp;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'charge':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'order':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'account':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse h-96 bg-muted rounded-3xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar with inline event indicators */}
      <Card className="lg:col-span-2 p-8">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl font-display">Activity Calendar</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            onMonthChange={setCurrentMonth}
            className="rounded-3xl border-0"
            modifiers={{
              hasEvents: (date) => getEventsForDate(date).length > 0,
            }}
            modifiersClassNames={{
              hasEvents: 'relative',
            }}
            components={{
              DayContent: ({ date, ...props }) => {
                const dayEvents = getEventsByType(date);
                const hasEvents = dayEvents.charges.length + dayEvents.orders.length + dayEvents.accounts.length > 0;
                const isCurrentMonth = isSameMonth(date, currentMonth);

                return (
                  <div className="relative w-full h-full flex flex-col items-center justify-start pt-1">
                    <span className={!isCurrentMonth ? 'text-muted-foreground/50' : ''}>{format(date, 'd')}</span>
                    {hasEvents && isCurrentMonth && (
                      <div className="flex gap-0.5 mt-1">
                        {dayEvents.charges.length > 0 && (
                          <div className="w-1 h-1 rounded-full bg-red-500" title={`${dayEvents.charges.length} charge(s)`} />
                        )}
                        {dayEvents.orders.length > 0 && (
                          <div className="w-1 h-1 rounded-full bg-green-500" title={`${dayEvents.orders.length} order(s)`} />
                        )}
                        {dayEvents.accounts.length > 0 && (
                          <div className="w-1 h-1 rounded-full bg-blue-500" title={`${dayEvents.accounts.length} account(s)`} />
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Events for Selected Date */}
      <Card className="p-8">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl font-display">
            {format(selectedDate, 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {selectedDateEvents.map((event) => {
              const Icon = getEventIcon(event.type);
              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-2xl border ${getEventColor(event.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-1">{event.title}</p>
                      <p className="text-xs opacity-80 truncate">{event.accountName}</p>
                      {event.amount && (
                        <p className="text-base font-bold mt-2">
                          ${event.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {selectedDateEvents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No events on this date
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
