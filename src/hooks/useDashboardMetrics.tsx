import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from './useBrandContext';
import { useAuth } from './useAuth';
import { useMockupMode } from './useMockupMode';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, format, eachDayOfInterval, eachHourOfInterval, isSameDay } from 'date-fns';

export interface DashboardMetrics {
  userName: string | null;
  todayRevenue: number;
  yesterdayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  ordersToday: number;
  activeVendors: number;
  avgOrderValue: number;
  pendingPayments: number;
  dailyRevenue: { date: string; amount: number }[];
  topVendors: { name: string; revenue: number; orderCount: number; avgOrderValue: number }[];
  salesChannels: { pos: number; online: number; tiktok: number };
  recentOrders: {
    orderNumber: string;
    vendor: string;
    amount: number;
    time: string;
    source: string;
  }[];
  // Comparison data
  comparisonDailyRevenue?: { date: string; amount: number }[];
  comparisonTotalRevenue?: number;
}

export interface DateRangeState {
  start: Date;
  end: Date;
  comparison?: {
    start: Date;
    end: Date;
  };
}

export function useDashboardMetrics(dateRange?: DateRangeState) {
  const { currentBrand } = useBrandContext();
  const { user } = useAuth();
  const { inflateNumber, inflateString, mockupMode, sessionSeed } = useMockupMode();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    if (!currentBrand?.id) return;

    try {
      setLoading(true);

      // Fetch user profile for personalized greeting
      let userName = null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        userName = profile?.full_name || null;
      }

      const now = new Date();
      const today = startOfDay(now);
      const yesterday = startOfDay(subDays(now, 1));
      const weekStart = startOfWeek(now);
      const monthStart = startOfMonth(now);

      // Use date range if provided, otherwise default to last 30 days
      const rangeStart = dateRange?.start || subDays(now, 30);
      const rangeEnd = dateRange?.end || now;

      // Fetch shopify_orders for REVENUE data (sales to customers)
      const { data: orders, error } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('brand_id', currentBrand.id)
        .gte('order_date', rangeStart.toISOString())
        .lte('order_date', endOfDay(rangeEnd).toISOString());

      if (error) throw error;

      // Also fetch all orders for today/week/month calculations (may extend beyond range)
      const { data: allOrders } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('brand_id', currentBrand.id);

      const allOrdersList = allOrders || [];

      // Calculate today's revenue
      const todayRevenue = allOrdersList
        .filter(o => new Date(o.order_date) >= today)
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      // Calculate yesterday's revenue
      const yesterdayRevenue = allOrdersList
        .filter(o => {
          const date = new Date(o.order_date);
          return date >= yesterday && date < today;
        })
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      // Calculate week revenue
      const weekRevenue = allOrdersList
        .filter(o => new Date(o.order_date) >= weekStart)
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      // Calculate month revenue
      const monthRevenue = allOrdersList
        .filter(o => new Date(o.order_date) >= monthStart)
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      // Orders today count
      const ordersToday = allOrdersList.filter(o => new Date(o.order_date) >= today).length;

      // Orders in range
      const ordersInRange = orders || [];

      // Active vendors (unique vendors with orders in date range)
      const activeVendors = new Set(ordersInRange.map(o => o.vendor)).size;

      // Average order value in range
      const avgOrderValue = ordersInRange.length > 0 
        ? ordersInRange.reduce((sum, o) => sum + Number(o.total_amount), 0) / ordersInRange.length 
        : 0;

      // Pending payments - use accounts manual_balance for vendor expenses
      const { data: accounts } = await supabase
        .from('accounts')
        .select('manual_balance')
        .eq('brand_id', currentBrand.id);
      
      const pendingPayments = (accounts || [])
        .reduce((sum, a) => sum + Number(a.manual_balance || 0), 0);

      // Check if single day selection (for hourly view)
      const isSingleDay = isSameDay(rangeStart, rangeEnd);
      
      let dailyRevenue: { date: string; amount: number }[];
      
      if (isSingleDay) {
        // Hourly view for single day
        const hours = eachHourOfInterval({ 
          start: startOfDay(rangeStart), 
          end: endOfDay(rangeEnd) 
        });
        const hourlyRevenueMap = new Map<string, number>();
        hours.forEach(hour => {
          hourlyRevenueMap.set(format(hour, 'HH:mm'), 0);
        });

        ordersInRange.forEach(o => {
          const orderHour = format(new Date(o.order_date), 'HH:mm');
          // Round to nearest hour
          const hourKey = orderHour.substring(0, 2) + ':00';
          if (hourlyRevenueMap.has(hourKey)) {
            hourlyRevenueMap.set(hourKey, hourlyRevenueMap.get(hourKey)! + Number(o.total_amount));
          }
        });

        dailyRevenue = Array.from(hourlyRevenueMap.entries())
          .map(([date, amount]) => ({ date, amount }))
          .sort((a, b) => a.date.localeCompare(b.date));
      } else {
        // Daily view for multiple days
        const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
        const dailyRevenueMap = new Map<string, number>();
        days.forEach(day => {
          dailyRevenueMap.set(format(day, 'yyyy-MM-dd'), 0);
        });

        ordersInRange.forEach(o => {
          const date = format(new Date(o.order_date), 'yyyy-MM-dd');
          if (dailyRevenueMap.has(date)) {
            dailyRevenueMap.set(date, dailyRevenueMap.get(date)! + Number(o.total_amount));
          }
        });

        dailyRevenue = Array.from(dailyRevenueMap.entries())
          .map(([date, amount]) => ({ date, amount }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }

      // Comparison data if comparison range is provided
      let comparisonDailyRevenue: { date: string; amount: number }[] | undefined;
      let comparisonTotalRevenue: number | undefined;

      if (dateRange?.comparison) {
        const { data: compOrders } = await supabase
          .from('shopify_orders')
          .select('*')
          .eq('brand_id', currentBrand.id)
          .gte('order_date', dateRange.comparison.start.toISOString())
          .lte('order_date', endOfDay(dateRange.comparison.end).toISOString());

        const compOrdersList = compOrders || [];

        const compDays = eachDayOfInterval({ 
          start: dateRange.comparison.start, 
          end: dateRange.comparison.end 
        });
        const compMap = new Map<string, number>();
        compDays.forEach(day => {
          compMap.set(format(day, 'yyyy-MM-dd'), 0);
        });

        compOrdersList.forEach(o => {
          const date = format(new Date(o.order_date), 'yyyy-MM-dd');
          if (compMap.has(date)) {
            compMap.set(date, compMap.get(date)! + Number(o.total_amount));
          }
        });

        comparisonDailyRevenue = Array.from(compMap.entries())
          .map(([date, amount]) => ({ date, amount }))
          .sort((a, b) => a.date.localeCompare(b.date));

        comparisonTotalRevenue = comparisonDailyRevenue.reduce((sum, d) => sum + d.amount, 0);
      }

      // Top vendors - by sales revenue in the date range
      const vendorMap = new Map<string, { name: string; revenue: number; orderCount: number }>();
      ordersInRange.forEach(o => {
        const existing = vendorMap.get(o.vendor);
        if (existing) {
          existing.revenue += Number(o.total_amount);
          existing.orderCount += 1;
        } else {
          vendorMap.set(o.vendor, {
            name: o.vendor,
            revenue: Number(o.total_amount),
            orderCount: 1,
          });
        }
      });

      const topVendors = Array.from(vendorMap.values())
        .map(v => ({
          ...v,
          avgOrderValue: v.revenue / v.orderCount,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Sales channels from orders source field (in date range)
      let posRevenue = 0;
      let onlineRevenue = 0;
      let tiktokRevenue = 0;

      ordersInRange.forEach(o => {
        const source = (o.source || '').toLowerCase();
        const amount = Number(o.total_amount);
        
        if (source === 'pos') {
          posRevenue += amount;
        } else if (source === 'tiktok') {
          tiktokRevenue += amount;
        } else {
          onlineRevenue += amount;
        }
      });

      // Recent orders - show most recent by order date
      const recentOrders = ordersInRange
        .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
        .slice(0, 20)
        .map(o => ({
          orderNumber: `#${o.order_number}`,
          vendor: o.vendor,
          amount: Number(o.total_amount),
          time: o.order_date,
          source: o.source || 'online',
        }));

      setMetrics({
        userName,
        todayRevenue,
        yesterdayRevenue,
        weekRevenue,
        monthRevenue,
        ordersToday,
        activeVendors,
        avgOrderValue,
        pendingPayments,
        dailyRevenue,
        topVendors,
        salesChannels: { pos: posRevenue, online: onlineRevenue, tiktok: tiktokRevenue },
        recentOrders,
        comparisonDailyRevenue,
        comparisonTotalRevenue,
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Set up real-time subscription for shopify_orders
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopify_orders',
        },
        () => fetchMetrics()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
        },
        () => fetchMetrics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBrand?.id, dateRange?.start?.getTime(), dateRange?.end?.getTime(), dateRange?.comparison?.start?.getTime(), dateRange?.comparison?.end?.getTime()]);

  // Apply mockup mode inflation to the metrics
  const inflatedMetrics = metrics ? {
    ...metrics,
    todayRevenue: inflateNumber(metrics.todayRevenue, 'revenue'),
    yesterdayRevenue: inflateNumber(metrics.yesterdayRevenue, 'revenue'),
    weekRevenue: inflateNumber(metrics.weekRevenue, 'revenue'),
    monthRevenue: inflateNumber(metrics.monthRevenue, 'revenue'),
    ordersToday: inflateNumber(metrics.ordersToday, 'orders'),
    activeVendors: inflateNumber(metrics.activeVendors, 'accounts'),
    avgOrderValue: inflateNumber(metrics.avgOrderValue, 'revenue'),
    pendingPayments: inflateNumber(metrics.pendingPayments, 'balance'),
    dailyRevenue: metrics.dailyRevenue.map(d => ({
      ...d,
      amount: inflateNumber(d.amount, 'revenue')
    })),
    topVendors: metrics.topVendors.map(v => ({
      ...v,
      name: inflateString(v.name, 'vendor') || v.name,
      revenue: inflateNumber(v.revenue, 'revenue'),
      orderCount: inflateNumber(v.orderCount, 'orders'),
      avgOrderValue: inflateNumber(v.avgOrderValue, 'revenue'),
    })),
    salesChannels: {
      pos: inflateNumber(metrics.salesChannels.pos, 'revenue'),
      online: inflateNumber(metrics.salesChannels.online, 'revenue'),
      tiktok: inflateNumber(metrics.salesChannels.tiktok, 'revenue'),
    },
    recentOrders: metrics.recentOrders.map(o => ({
      ...o,
      vendor: inflateString(o.vendor, 'vendor') || o.vendor,
      amount: inflateNumber(o.amount, 'revenue'),
    })),
    comparisonDailyRevenue: metrics.comparisonDailyRevenue?.map(d => ({
      ...d,
      amount: inflateNumber(d.amount, 'revenue')
    })),
    comparisonTotalRevenue: metrics.comparisonTotalRevenue 
      ? inflateNumber(metrics.comparisonTotalRevenue, 'revenue') 
      : undefined,
  } : null;

  return { metrics: inflatedMetrics, loading, refresh: fetchMetrics };
}
