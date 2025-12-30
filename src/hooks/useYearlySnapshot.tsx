import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMockupMode } from './useMockupMode';

interface SnapshotData {
  topVendor: { name: string; revenue: number } | null;
  lowestVendor: { name: string; revenue: number } | null;
  bestMonth: { month: string; revenue: number } | null;
  totalRevenue: number;
  totalOrders: number;
  mostConsistentVendor: { name: string; months: number } | null;
  avgOrderValue: number;
  yearOverYearGrowth: number | null;
  topProduct: string | null;
  peakDay: { date: string; orders: number } | null;
}

export function useYearlySnapshot(brandId: string | undefined) {
  const { inflateNumber, inflateString, sessionSeed } = useMockupMode();
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      setLoading(false);
      return;
    }

    const fetchSnapshot = async () => {
      try {
        setLoading(true);
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;
        const lastYearStart = `${currentYear - 1}-01-01`;
        const lastYearEnd = `${currentYear - 1}-12-31`;

        // Get all invoices for this year
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            id,
            amount,
            created_at,
            paid_date,
            notes,
            account:accounts!inner(
              id,
              account_name,
              brand_id
            )
          `)
          .eq('account.brand_id', brandId)
          .gte('created_at', startOfYear)
          .lte('created_at', endOfYear);

        if (invoicesError) throw invoicesError;

        // Get last year's invoices for comparison
        const { data: lastYearInvoices } = await supabase
          .from('invoices')
          .select(`
            amount,
            account:accounts!inner(brand_id)
          `)
          .eq('account.brand_id', brandId)
          .gte('created_at', lastYearStart)
          .lte('created_at', lastYearEnd);

        if (!invoices || invoices.length === 0) {
          setData({
            topVendor: null,
            lowestVendor: null,
            bestMonth: null,
            totalRevenue: 0,
            totalOrders: 0,
            mostConsistentVendor: null,
            avgOrderValue: 0,
            yearOverYearGrowth: null,
            topProduct: null,
            peakDay: null,
          });
          setLoading(false);
          return;
        }

        // Calculate vendor revenue
        const vendorRevenue: Record<string, number> = {};
        const vendorMonths: Record<string, Set<number>> = {};
        const monthlyRevenue: Record<string, number> = {};
        const dailyOrders: Record<string, number> = {};

        invoices.forEach((inv: any) => {
          const vendor = inv.account?.account_name || 'Unknown';
          const amount = Number(inv.amount) || 0;
          const date = new Date(inv.created_at);
          const month = date.toLocaleString('default', { month: 'long' });
          const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
          const dayKey = date.toISOString().split('T')[0];

          // Vendor revenue
          vendorRevenue[vendor] = (vendorRevenue[vendor] || 0) + amount;

          // Vendor months
          if (!vendorMonths[vendor]) vendorMonths[vendor] = new Set();
          vendorMonths[vendor].add(date.getMonth());

          // Monthly revenue
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amount;

          // Daily orders
          dailyOrders[dayKey] = (dailyOrders[dayKey] || 0) + 1;
        });

        // Sort vendors by revenue
        const sortedVendors = Object.entries(vendorRevenue)
          .sort((a, b) => b[1] - a[1]);

        const topVendor = sortedVendors.length > 0 
          ? { name: sortedVendors[0][0], revenue: sortedVendors[0][1] }
          : null;

        const lowestVendor = sortedVendors.length > 1
          ? { name: sortedVendors[sortedVendors.length - 1][0], revenue: sortedVendors[sortedVendors.length - 1][1] }
          : null;

        // Best month
        const sortedMonths = Object.entries(monthlyRevenue)
          .sort((a, b) => b[1] - a[1]);
        const bestMonth = sortedMonths.length > 0
          ? { month: sortedMonths[0][0], revenue: sortedMonths[0][1] }
          : null;

        // Most consistent vendor
        const sortedByConsistency = Object.entries(vendorMonths)
          .map(([name, months]) => ({ name, months: months.size }))
          .sort((a, b) => b.months - a.months);
        const mostConsistentVendor = sortedByConsistency.length > 0
          ? sortedByConsistency[0]
          : null;

        // Peak day
        const sortedDays = Object.entries(dailyOrders)
          .sort((a, b) => b[1] - a[1]);
        const peakDay = sortedDays.length > 0
          ? { date: sortedDays[0][0], orders: sortedDays[0][1] }
          : null;

        // Total calculations
        const totalRevenue = Object.values(vendorRevenue).reduce((sum, v) => sum + v, 0);
        const totalOrders = invoices.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Year over year growth
        const lastYearTotal = (lastYearInvoices || []).reduce(
          (sum: number, inv: any) => sum + (Number(inv.amount) || 0),
          0
        );
        const yearOverYearGrowth = lastYearTotal > 0
          ? ((totalRevenue - lastYearTotal) / lastYearTotal) * 100
          : null;

        setData({
          topVendor,
          lowestVendor,
          bestMonth,
          totalRevenue,
          totalOrders,
          mostConsistentVendor,
          avgOrderValue,
          yearOverYearGrowth,
          topProduct: null, // Would need product data
          peakDay,
        });

      } catch (err) {
        console.error('Error fetching snapshot:', err);
        setError(err instanceof Error ? err.message : 'Failed to load snapshot');
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();
  }, [brandId]);

  // Apply mockup mode inflation
  const inflatedData = data ? {
    topVendor: data.topVendor ? {
      name: inflateString(data.topVendor.name, 'vendor') || data.topVendor.name,
      revenue: inflateNumber(data.topVendor.revenue, 'revenue'),
    } : null,
    lowestVendor: data.lowestVendor ? {
      name: inflateString(data.lowestVendor.name, 'vendor') || data.lowestVendor.name,
      revenue: inflateNumber(data.lowestVendor.revenue, 'revenue'),
    } : null,
    bestMonth: data.bestMonth ? {
      month: data.bestMonth.month,
      revenue: inflateNumber(data.bestMonth.revenue, 'revenue'),
    } : null,
    totalRevenue: inflateNumber(data.totalRevenue, 'revenue'),
    totalOrders: inflateNumber(data.totalOrders, 'orders'),
    mostConsistentVendor: data.mostConsistentVendor ? {
      name: inflateString(data.mostConsistentVendor.name, 'vendor') || data.mostConsistentVendor.name,
      months: data.mostConsistentVendor.months,
    } : null,
    avgOrderValue: inflateNumber(data.avgOrderValue, 'revenue'),
    yearOverYearGrowth: data.yearOverYearGrowth !== null 
      ? inflateNumber(data.yearOverYearGrowth, 'percentage') 
      : null,
    topProduct: data.topProduct,
    peakDay: data.peakDay ? {
      date: data.peakDay.date,
      orders: inflateNumber(data.peakDay.orders, 'orders'),
    } : null,
  } : null;

  return { data: inflatedData, loading, error };
}
