import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from './useBrandContext';
import { startOfDay, startOfWeek, subWeeks, format } from 'date-fns';

interface OrderNotification {
  id: string;
  order_number: string;
  customer_name: string | null;
  total_amount: number;
  created_at: string;
}

interface StckMetrics {
  todayOrders: number;
  todayRevenue: number;
  weekRevenue: number;
  lastWeekRevenue: number;
  topVendor: string | null;
  totalAccounts: number;
  pendingBalance: number;
}

interface FunFact {
  emoji: string;
  text: string;
}

export function useStckMetrics() {
  const { currentBrand } = useBrandContext();
  const [metrics, setMetrics] = useState<StckMetrics>({
    todayOrders: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    lastWeekRevenue: 0,
    topVendor: null,
    totalAccounts: 0,
    pendingBalance: 0
  });
  const [recentOrders, setRecentOrders] = useState<OrderNotification[]>([]);
  const [newOrder, setNewOrder] = useState<OrderNotification | null>(null);

  // Fetch metrics
  useEffect(() => {
    if (!currentBrand?.id) return;

    const fetchMetrics = async () => {
      const today = startOfDay(new Date());
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const lastWeekStart = subWeeks(weekStart, 1);

      // Today's orders
      const { data: todayData } = await supabase
        .from('shopify_orders')
        .select('total_amount, vendor')
        .eq('brand_id', currentBrand.id)
        .gte('order_date', today.toISOString());

      const todayOrders = todayData?.length || 0;
      const todayRevenue = todayData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // This week's revenue
      const { data: weekData } = await supabase
        .from('shopify_orders')
        .select('total_amount')
        .eq('brand_id', currentBrand.id)
        .gte('order_date', weekStart.toISOString());

      const weekRevenue = weekData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Last week's revenue
      const { data: lastWeekData } = await supabase
        .from('shopify_orders')
        .select('total_amount')
        .eq('brand_id', currentBrand.id)
        .gte('order_date', lastWeekStart.toISOString())
        .lt('order_date', weekStart.toISOString());

      const lastWeekRevenue = lastWeekData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Top vendor (most orders)
      const vendorCounts: Record<string, number> = {};
      todayData?.forEach(o => {
        if (o.vendor) {
          vendorCounts[o.vendor] = (vendorCounts[o.vendor] || 0) + 1;
        }
      });
      const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Total accounts
      const { count: totalAccounts } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id);

      // Pending balance
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('amount, paid_amount, accounts!inner(brand_id)')
        .eq('accounts.brand_id', currentBrand.id)
        .in('status', ['pending', 'partial']);

      const pendingBalance = invoiceData?.reduce((sum, inv) => {
        return sum + ((inv.amount || 0) - (inv.paid_amount || 0));
      }, 0) || 0;

      setMetrics({
        todayOrders,
        todayRevenue,
        weekRevenue,
        lastWeekRevenue,
        topVendor,
        totalAccounts: totalAccounts || 0,
        pendingBalance
      });
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [currentBrand?.id]);

  // Fetch recent orders
  useEffect(() => {
    if (!currentBrand?.id) return;

    const fetchRecentOrders = async () => {
      const { data } = await supabase
        .from('shopify_orders')
        .select('id, order_number, customer_name, total_amount, created_at')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setRecentOrders(data);
      }
    };

    fetchRecentOrders();
  }, [currentBrand?.id]);

  // Real-time order subscription
  useEffect(() => {
    if (!currentBrand?.id) return;

    const channel = supabase
      .channel('stck-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shopify_orders',
          filter: `brand_id=eq.${currentBrand.id}`
        },
        (payload) => {
          const order = payload.new as OrderNotification;
          setNewOrder(order);
          setRecentOrders(prev => [order, ...prev.slice(0, 4)]);
          
          // Clear notification after 5 seconds
          setTimeout(() => setNewOrder(null), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBrand?.id]);

  // Generate fun facts
  const generateFunFacts = (): FunFact[] => {
    const facts: FunFact[] = [];

    if (metrics.todayOrders > 0) {
      facts.push({
        emoji: '📦',
        text: `${metrics.todayOrders} order${metrics.todayOrders !== 1 ? 's' : ''} so far today`
      });
    }

    if (metrics.todayRevenue > 0) {
      facts.push({
        emoji: '💵',
        text: `$${metrics.todayRevenue.toLocaleString()} in revenue today`
      });
    }

    if (metrics.weekRevenue > 0) {
      facts.push({
        emoji: '📈',
        text: `$${metrics.weekRevenue.toLocaleString()} this week`
      });
    }

    if (metrics.lastWeekRevenue > 0 && metrics.weekRevenue > 0) {
      const change = ((metrics.weekRevenue - metrics.lastWeekRevenue) / metrics.lastWeekRevenue) * 100;
      if (change > 0) {
        facts.push({
          emoji: '🚀',
          text: `Revenue up ${change.toFixed(0)}% vs last week`
        });
      } else if (change < 0) {
        facts.push({
          emoji: '📉',
          text: `Revenue down ${Math.abs(change).toFixed(0)}% vs last week`
        });
      }
    }

    if (metrics.topVendor) {
      facts.push({
        emoji: '🏆',
        text: `Top vendor today: ${metrics.topVendor}`
      });
    }

    if (metrics.totalAccounts > 0) {
      facts.push({
        emoji: '👥',
        text: `${metrics.totalAccounts} active account${metrics.totalAccounts !== 1 ? 's' : ''}`
      });
    }

    if (metrics.pendingBalance > 0) {
      facts.push({
        emoji: '⏳',
        text: `$${metrics.pendingBalance.toLocaleString()} pending collection`
      });
    }

    // Add some static fun facts if we don't have enough data
    if (facts.length < 3) {
      facts.push({
        emoji: '✨',
        text: 'Ready for new orders'
      });
    }

    return facts;
  };

  return {
    metrics,
    recentOrders,
    newOrder,
    funFacts: generateFunFacts()
  };
}
