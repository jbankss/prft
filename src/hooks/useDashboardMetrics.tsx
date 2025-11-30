import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from './useBrandContext';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';

export interface DashboardMetrics {
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
  salesChannels: { pos: number; online: number };
  recentOrders: {
    orderNumber: string;
    vendor: string;
    amount: number;
    time: string;
    source: string;
  }[];
}

export function useDashboardMetrics(dateRange?: { start: Date; end: Date }) {
  const { currentBrand } = useBrandContext();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    if (!currentBrand?.id) return;

    try {
      setLoading(true);
      const now = new Date();
      const today = startOfDay(now);
      const yesterday = startOfDay(subDays(now, 1));
      const weekStart = startOfWeek(now);
      const monthStart = startOfMonth(now);
      const thirtyDaysAgo = subDays(now, 30);

      // Fetch invoices with accounts
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          *,
          accounts!inner(account_name, brand_id)
        `)
        .eq('accounts.brand_id', currentBrand.id);

      if (error) throw error;

      // Calculate today's revenue
      const todayRevenue = invoices
        ?.filter(inv => new Date(inv.created_at) >= today)
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Calculate yesterday's revenue
      const yesterdayRevenue = invoices
        ?.filter(inv => {
          const date = new Date(inv.created_at);
          return date >= yesterday && date < today;
        })
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Calculate week revenue
      const weekRevenue = invoices
        ?.filter(inv => new Date(inv.created_at) >= weekStart)
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Calculate month revenue
      const monthRevenue = invoices
        ?.filter(inv => new Date(inv.created_at) >= monthStart)
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Orders today
      const ordersToday = invoices?.filter(inv => new Date(inv.created_at) >= today).length || 0;

      // Active vendors (accounts with invoices)
      const activeVendors = new Set(invoices?.map(inv => inv.account_id)).size;

      // Average order value
      const avgOrderValue = invoices && invoices.length > 0 
        ? invoices.reduce((sum, inv) => sum + Number(inv.amount), 0) / invoices.length 
        : 0;

      // Pending payments
      const pendingPayments = invoices
        ?.filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Daily revenue for last 30 days
      const dailyRevenueMap = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const date = subDays(now, i);
        const dateStr = date.toISOString().split('T')[0];
        dailyRevenueMap.set(dateStr, 0);
      }

      invoices?.forEach(inv => {
        const date = new Date(inv.created_at).toISOString().split('T')[0];
        if (dailyRevenueMap.has(date)) {
          dailyRevenueMap.set(date, dailyRevenueMap.get(date)! + Number(inv.amount));
        }
      });

      const dailyRevenue = Array.from(dailyRevenueMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top vendors
      const vendorMap = new Map<string, { name: string; revenue: number; orderCount: number }>();
      invoices?.forEach(inv => {
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

      // Sales channels from webhook logs
      const { data: webhookLogs } = await supabase
        .from('webhook_logs')
        .select('request_data')
        .eq('brand_id', currentBrand.id)
        .eq('status', 'success');

      let posRevenue = 0;
      let onlineRevenue = 0;

      webhookLogs?.forEach(log => {
        const data = log.request_data as any;
        const source = data?.source_name?.toLowerCase() || '';
        const amount = Number(data?.current_total_price || 0);
        
        if (source.includes('pos') || source.includes('point of sale')) {
          posRevenue += amount;
        } else {
          onlineRevenue += amount;
        }
      });

      // Recent orders from webhook logs
      const { data: recentWebhooks } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('brand_id', currentBrand.id)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(20);

      const recentOrders = recentWebhooks?.map(log => {
        const data = log.request_data as any;
        const lineItems = data?.line_items || [];
        const vendor = lineItems[0]?.vendor || 'Unknown';
        
        return {
          orderNumber: data?.name || data?.order_number || 'N/A',
          vendor,
          amount: Number(data?.current_total_price || 0),
          time: new Date(log.created_at).toISOString(),
          source: data?.source_name || 'Online',
        };
      }) || [];

      setMetrics({
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
        salesChannels: { pos: posRevenue, online: onlineRevenue },
        recentOrders,
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
  }, [currentBrand?.id, dateRange]);

  return { metrics, loading, refresh: fetchMetrics };
}
