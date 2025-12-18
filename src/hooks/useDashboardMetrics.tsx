import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from './useBrandContext';
import { useAuth } from './useAuth';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, format, eachDayOfInterval } from 'date-fns';

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

      // Fetch invoices with accounts - use due_date for actual order date
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          *,
          accounts!inner(account_name, brand_id)
        `)
        .eq('accounts.brand_id', currentBrand.id);

      if (error) throw error;

      // Filter by date range using due_date (actual order date from Shopify)
      const getOrderDate = (inv: any) => {
        // For Shopify orders, due_date contains the actual order date
        // Fall back to created_at for manual entries
        return new Date(inv.due_date || inv.created_at);
      };

      // Calculate today's revenue using actual order date
      const todayRevenue = invoices
        ?.filter(inv => getOrderDate(inv) >= today)
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Calculate yesterday's revenue
      const yesterdayRevenue = invoices
        ?.filter(inv => {
          const date = getOrderDate(inv);
          return date >= yesterday && date < today;
        })
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Calculate week revenue
      const weekRevenue = invoices
        ?.filter(inv => getOrderDate(inv) >= weekStart)
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Calculate month revenue
      const monthRevenue = invoices
        ?.filter(inv => getOrderDate(inv) >= monthStart)
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Orders today - using actual order date
      const ordersToday = invoices?.filter(inv => getOrderDate(inv) >= today).length || 0;

      // Active vendors (accounts with invoices in date range)
      const invoicesInRange = invoices?.filter(inv => {
        const date = getOrderDate(inv);
        return date >= rangeStart && date <= rangeEnd;
      }) || [];
      
      const activeVendors = new Set(invoicesInRange.map(inv => inv.account_id)).size;

      // Average order value in range
      const avgOrderValue = invoicesInRange.length > 0 
        ? invoicesInRange.reduce((sum, inv) => sum + Number(inv.amount), 0) / invoicesInRange.length 
        : 0;

      // Pending payments
      const pendingPayments = invoices
        ?.filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Daily revenue for date range
      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      const dailyRevenueMap = new Map<string, number>();
      days.forEach(day => {
        dailyRevenueMap.set(format(day, 'yyyy-MM-dd'), 0);
      });

      invoices?.forEach(inv => {
        const date = format(getOrderDate(inv), 'yyyy-MM-dd');
        if (dailyRevenueMap.has(date)) {
          dailyRevenueMap.set(date, dailyRevenueMap.get(date)! + Number(inv.amount));
        }
      });

      const dailyRevenue = Array.from(dailyRevenueMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Comparison data if comparison range is provided
      let comparisonDailyRevenue: { date: string; amount: number }[] | undefined;
      let comparisonTotalRevenue: number | undefined;

      if (dateRange?.comparison) {
        const compDays = eachDayOfInterval({ 
          start: dateRange.comparison.start, 
          end: dateRange.comparison.end 
        });
        const compMap = new Map<string, number>();
        compDays.forEach(day => {
          compMap.set(format(day, 'yyyy-MM-dd'), 0);
        });

        invoices?.forEach(inv => {
          const orderDate = getOrderDate(inv);
          const date = format(orderDate, 'yyyy-MM-dd');
          if (compMap.has(date)) {
            compMap.set(date, compMap.get(date)! + Number(inv.amount));
          }
        });

        comparisonDailyRevenue = Array.from(compMap.entries())
          .map(([date, amount]) => ({ date, amount }))
          .sort((a, b) => a.date.localeCompare(b.date));

        comparisonTotalRevenue = comparisonDailyRevenue.reduce((sum, d) => sum + d.amount, 0);
      }

      // Top vendors
      const vendorMap = new Map<string, { name: string; revenue: number; orderCount: number }>();
      invoicesInRange.forEach(inv => {
        const existing = vendorMap.get(inv.account_id);
        const vendorName = (inv.accounts as any).account_name;
        if (existing) {
          existing.revenue += Number(inv.amount);
          existing.orderCount += 1;
        } else {
          vendorMap.set(inv.account_id, {
            name: vendorName,
            revenue: Number(inv.amount),
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

      // Sales channels from invoices source field (in date range)
      let posRevenue = 0;
      let onlineRevenue = 0;
      let tiktokRevenue = 0;

      invoicesInRange.forEach(inv => {
        const source = (inv.source || '').toLowerCase();
        const amount = Number(inv.amount);
        
        if (source === 'pos') {
          posRevenue += amount;
        } else if (source === 'tiktok') {
          tiktokRevenue += amount;
        } else {
          onlineRevenue += amount;
        }
      });

      // Recent orders - show most recent by actual order date, not import date
      // Prioritize webhook orders (where created_at is close to due_date)
      const recentOrders = invoices
        ?.sort((a, b) => getOrderDate(b).getTime() - getOrderDate(a).getTime())
        .slice(0, 20)
        .map(inv => ({
          orderNumber: inv.invoice_number,
          vendor: (inv.accounts as any).account_name,
          amount: Number(inv.amount),
          time: inv.due_date || inv.created_at, // Use actual order time
          source: inv.source || 'online',
        })) || [];

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

    // Set up real-time subscription
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
        },
        () => fetchMetrics()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webhook_logs',
        },
        () => fetchMetrics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBrand?.id, dateRange?.start?.getTime(), dateRange?.end?.getTime(), dateRange?.comparison?.start?.getTime(), dateRange?.comparison?.end?.getTime()]);

  return { metrics, loading, refresh: fetchMetrics };
}
