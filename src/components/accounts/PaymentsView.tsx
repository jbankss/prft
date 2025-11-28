import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Payment {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
  account_id: string;
  accounts: {
    account_name: string;
  };
}

export function PaymentsView({ brandId }: { brandId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
  });

  useEffect(() => {
    fetchPayments();

    const channel = supabase
      .channel('payments-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchPayments)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId]);

  const fetchPayments = async () => {
    try {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('brand_id', brandId);

      if (!accounts || accounts.length === 0) {
        setLoading(false);
        return;
      }

      const accountIds = accounts.map((a) => a.id);

      const { data, error } = await supabase
        .from('invoices')
        .select('*, accounts(account_name)')
        .in('account_id', accountIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments(data || []);

      // Calculate stats
      const now = new Date();
      const totalPaid = data?.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalPending = data?.filter((p) => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalOverdue = data?.filter((p) => {
        if (p.status !== 'pending' || !p.due_date) return false;
        return new Date(p.due_date) < now;
      }).reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({ totalPaid, totalPending, totalOverdue });
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string, dueDate: string | null) => {
    if (status === 'paid') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'pending' && dueDate && new Date(dueDate) < new Date()) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (status: string, dueDate: string | null) => {
    if (status === 'paid') return <Badge variant="default">Paid</Badge>;
    if (status === 'pending' && dueDate && new Date(dueDate) < new Date()) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Paid</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-500">
              ${stats.totalPaid.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl text-yellow-500">
              ${stats.totalPending.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overdue</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-500">
              ${stats.totalOverdue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.invoice_number}</TableCell>
                  <TableCell>{payment.accounts.account_name}</TableCell>
                  <TableCell className="font-semibold">
                    ${Number(payment.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {payment.due_date ? new Date(payment.due_date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status, payment.due_date)}
                      {getStatusBadge(payment.status, payment.due_date)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No payments recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
