import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from './useBrandContext';
import { useMockupMode } from './useMockupMode';
import { startOfDay, startOfWeek, startOfMonth, subWeeks, subMonths, format, differenceInDays } from 'date-fns';

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
  monthRevenue: number;
  lastMonthRevenue: number;
  topVendor: string | null;
  topVendorRevenue: number;
  totalAccounts: number;
  activeAccounts: number;
  pendingBalance: number;
  avgOrderValue: number;
  largestOrder: number;
  totalOrders: number;
  uniqueVendors: number;
  bestDay: string | null;
  bestDayRevenue: number;
}

interface FunFact {
  emoji: string;
  text: string;
}

export function useStckMetrics() {
  const { currentBrand } = useBrandContext();
  const { inflateNumber, inflateString, mockupMode, sessionSeed } = useMockupMode();
  const [metrics, setMetrics] = useState<StckMetrics>({
    todayOrders: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    lastWeekRevenue: 0,
    monthRevenue: 0,
    lastMonthRevenue: 0,
    topVendor: null,
    topVendorRevenue: 0,
    totalAccounts: 0,
    activeAccounts: 0,
    pendingBalance: 0,
    avgOrderValue: 0,
    largestOrder: 0,
    totalOrders: 0,
    uniqueVendors: 0,
    bestDay: null,
    bestDayRevenue: 0
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
      const monthStart = startOfMonth(new Date());
      const lastMonthStart = subMonths(monthStart, 1);

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
        .select('total_amount, vendor, order_date')
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

      // This month's revenue
      const { data: monthData } = await supabase
        .from('shopify_orders')
        .select('total_amount')
        .eq('brand_id', currentBrand.id)
        .gte('order_date', monthStart.toISOString());

      const monthRevenue = monthData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Last month's revenue
      const { data: lastMonthData } = await supabase
        .from('shopify_orders')
        .select('total_amount')
        .eq('brand_id', currentBrand.id)
        .gte('order_date', lastMonthStart.toISOString())
        .lt('order_date', monthStart.toISOString());

      const lastMonthRevenue = lastMonthData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // All-time data for additional metrics
      const { data: allOrdersData } = await supabase
        .from('shopify_orders')
        .select('total_amount, vendor, order_date')
        .eq('brand_id', currentBrand.id);

      const totalOrders = allOrdersData?.length || 0;
      const allTimeRevenue = allOrdersData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const avgOrderValue = totalOrders > 0 ? allTimeRevenue / totalOrders : 0;
      const largestOrder = allOrdersData?.reduce((max, o) => Math.max(max, o.total_amount || 0), 0) || 0;

      // Unique vendors
      const vendorSet = new Set(allOrdersData?.map(o => o.vendor).filter(Boolean));
      const uniqueVendors = vendorSet.size;

      // Top vendor (by revenue)
      const vendorRevenue: Record<string, number> = {};
      allOrdersData?.forEach(o => {
        if (o.vendor) {
          vendorRevenue[o.vendor] = (vendorRevenue[o.vendor] || 0) + (o.total_amount || 0);
        }
      });
      const sortedVendors = Object.entries(vendorRevenue).sort((a, b) => b[1] - a[1]);
      const topVendor = sortedVendors[0]?.[0] || null;
      const topVendorRevenue = sortedVendors[0]?.[1] || 0;

      // Best day this week
      const dailyRevenue: Record<string, number> = {};
      weekData?.forEach(o => {
        const day = format(new Date(o.order_date), 'EEEE');
        dailyRevenue[day] = (dailyRevenue[day] || 0) + (o.total_amount || 0);
      });
      const sortedDays = Object.entries(dailyRevenue).sort((a, b) => b[1] - a[1]);
      const bestDay = sortedDays[0]?.[0] || null;
      const bestDayRevenue = sortedDays[0]?.[1] || 0;

      // Total accounts
      const { count: totalAccounts } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id);

      // Active accounts (have orders in last 30 days)
      const thirtyDaysAgo = subMonths(new Date(), 1);
      const { data: activeAccountsData } = await supabase
        .from('invoices')
        .select('account_id, accounts!inner(brand_id)')
        .eq('accounts.brand_id', currentBrand.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const activeAccountSet = new Set(activeAccountsData?.map(a => a.account_id));
      const activeAccounts = activeAccountSet.size;

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
        monthRevenue,
        lastMonthRevenue,
        topVendor,
        topVendorRevenue,
        totalAccounts: totalAccounts || 0,
        activeAccounts,
        pendingBalance,
        avgOrderValue,
        largestOrder,
        totalOrders,
        uniqueVendors,
        bestDay,
        bestDayRevenue
      });
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);

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

  // Generate 12-15 diverse fun facts
  const generateFunFacts = (): FunFact[] => {
    const facts: FunFact[] = [];

    // Apply mockup inflation to metrics
    const m = {
      todayOrders: inflateNumber(metrics.todayOrders, 'orders'),
      todayRevenue: inflateNumber(metrics.todayRevenue, 'revenue'),
      weekRevenue: inflateNumber(metrics.weekRevenue, 'revenue'),
      lastWeekRevenue: inflateNumber(metrics.lastWeekRevenue, 'revenue'),
      monthRevenue: inflateNumber(metrics.monthRevenue, 'revenue'),
      lastMonthRevenue: inflateNumber(metrics.lastMonthRevenue, 'revenue'),
      topVendor: inflateString(metrics.topVendor, 'vendor'),
      topVendorRevenue: inflateNumber(metrics.topVendorRevenue, 'revenue'),
      totalAccounts: inflateNumber(metrics.totalAccounts, 'accounts'),
      activeAccounts: inflateNumber(metrics.activeAccounts, 'accounts'),
      pendingBalance: inflateNumber(metrics.pendingBalance, 'balance'),
      avgOrderValue: inflateNumber(metrics.avgOrderValue, 'revenue'),
      largestOrder: inflateNumber(metrics.largestOrder, 'revenue'),
      totalOrders: inflateNumber(metrics.totalOrders, 'orders'),
      uniqueVendors: inflateNumber(metrics.uniqueVendors, 'accounts'),
      bestDay: metrics.bestDay,
      bestDayRevenue: inflateNumber(metrics.bestDayRevenue, 'revenue'),
    };

    // 1. Today's orders
    if (m.todayOrders > 0) {
      facts.push({
        emoji: '📦',
        text: `${m.todayOrders} order${m.todayOrders !== 1 ? 's' : ''} shipped today`
      });
    }

    // 2. Today's revenue
    if (m.todayRevenue > 0) {
      facts.push({
        emoji: '💵',
        text: `$${m.todayRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} in revenue today`
      });
    }

    // 3. Weekly revenue
    if (m.weekRevenue > 0) {
      facts.push({
        emoji: '📈',
        text: `$${m.weekRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} this week`
      });
    }

    // 4. Week-over-week comparison
    if (m.lastWeekRevenue > 0 && m.weekRevenue > 0) {
      const change = ((m.weekRevenue - m.lastWeekRevenue) / m.lastWeekRevenue) * 100;
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

    // 5. Monthly revenue
    if (m.monthRevenue > 0) {
      facts.push({
        emoji: '📊',
        text: `$${m.monthRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} this month`
      });
    }

    // 6. Month-over-month comparison
    if (m.lastMonthRevenue > 0 && m.monthRevenue > 0) {
      const change = ((m.monthRevenue - m.lastMonthRevenue) / m.lastMonthRevenue) * 100;
      if (change > 0) {
        facts.push({
          emoji: '📈',
          text: `Monthly sales up ${change.toFixed(0)}% vs last month`
        });
      }
    }

    // 7. Top vendor
    if (m.topVendor) {
      facts.push({
        emoji: '🏆',
        text: `Top retailer: ${m.topVendor}`
      });
    }

    // 8. Top vendor revenue
    if (m.topVendor && m.topVendorRevenue > 0) {
      facts.push({
        emoji: '💎',
        text: `${m.topVendor} has driven $${m.topVendorRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} in revenue`
      });
    }

    // 9. Total accounts
    if (m.totalAccounts > 0) {
      facts.push({
        emoji: '👥',
        text: `${m.totalAccounts} retail partner${m.totalAccounts !== 1 ? 's' : ''} on file`
      });
    }

    // 10. Active accounts
    if (m.activeAccounts > 0) {
      facts.push({
        emoji: '🔥',
        text: `${m.activeAccounts} account${m.activeAccounts !== 1 ? 's' : ''} active this month`
      });
    }

    // 11. Pending balance
    if (m.pendingBalance > 0) {
      facts.push({
        emoji: '⏳',
        text: `$${m.pendingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending collection`
      });
    }

    // 12. Average order value
    if (m.avgOrderValue > 0) {
      facts.push({
        emoji: '💰',
        text: `Average order: $${m.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      });
    }

    // 13. Largest order
    if (m.largestOrder > 0) {
      facts.push({
        emoji: '🎯',
        text: `Largest order: $${m.largestOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      });
    }

    // 14. Total orders all time
    if (m.totalOrders > 0) {
      facts.push({
        emoji: '📋',
        text: `${m.totalOrders.toLocaleString()} total orders processed`
      });
    }

    // 15. Unique vendors
    if (m.uniqueVendors > 0) {
      facts.push({
        emoji: '🏪',
        text: `Working with ${m.uniqueVendors} unique retailer${m.uniqueVendors !== 1 ? 's' : ''}`
      });
    }

    // 16. Best day this week
    if (m.bestDay && m.bestDayRevenue > 0) {
      facts.push({
        emoji: '⭐',
        text: `${m.bestDay} was the best day: $${m.bestDayRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      });
    }

    // Fallback
    if (facts.length < 3) {
      facts.push({
        emoji: '✨',
        text: 'Ready for new orders'
      });
    }

    return facts;
  };

  // Apply mockup mode to recent orders for display
  const inflatedRecentOrders = recentOrders.map(order => ({
    ...order,
    total_amount: inflateNumber(order.total_amount, 'revenue'),
    customer_name: inflateString(order.customer_name, 'customer')
  }));

  const inflatedNewOrder = newOrder ? {
    ...newOrder,
    total_amount: inflateNumber(newOrder.total_amount, 'revenue'),
    customer_name: inflateString(newOrder.customer_name, 'customer')
  } : null;

  return {
    metrics,
    recentOrders: inflatedRecentOrders,
    newOrder: inflatedNewOrder,
    funFacts: generateFunFacts()
  };
}
