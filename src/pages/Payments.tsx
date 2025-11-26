import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { PaymentDetailsDialog } from '@/components/payments/PaymentDetailsDialog';
import { Search, FileText, Calendar, DollarSign, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Payments() {
  const { currentBrand } = useBrandContext();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ['payments', currentBrand?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brandboom_payments')
        .select('*')
        .eq('brand_id', currentBrand?.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentBrand?.id,
  });

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch = 
      payment.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleared':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return 'cleared';
    if (status === 'pending') return 'submitted';
    return status;
  };

  const totalAmount = filteredPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const clearedAmount = filteredPayments?.filter(p => p.status === 'cleared' || p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const submittedAmount = filteredPayments?.filter(p => p.status === 'submitted' || p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const upcomingAmount = filteredPayments?.filter(p => p.status === 'upcoming').reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  if (isLoading) {
    return <div className="flex justify-center p-12">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-1">Track and manage brand purchase payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Total Amount</span>
          </div>
          <div className="text-2xl font-bold">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </Card>
        <Card className="p-4 border-l-4 border-green-500">
          <div className="text-muted-foreground text-sm mb-1">Cleared</div>
          <div className="text-2xl font-bold text-green-600">${clearedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </Card>
        <Card className="p-4 border-l-4 border-blue-500">
          <div className="text-muted-foreground text-sm mb-1">Submitted</div>
          <div className="text-2xl font-bold text-blue-600">${submittedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </Card>
        <Card className="p-4 border-l-4 border-yellow-500">
          <div className="text-muted-foreground text-sm mb-1">Upcoming</div>
          <div className="text-2xl font-bold text-yellow-600">${upcomingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by invoice number, transaction ID, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Payments List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-sm">Invoice #</th>
                <th className="text-left p-4 font-medium text-sm">Date</th>
                <th className="text-left p-4 font-medium text-sm">Amount</th>
                <th className="text-left p-4 font-medium text-sm">Method</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-left p-4 font-medium text-sm">Attachments</th>
                <th className="text-left p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments && filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium">{payment.invoice_number || '—'}</div>
                      {payment.transaction_id && (
                        <div className="text-xs text-muted-foreground">{payment.transaction_id}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(payment.payment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-lg">
                        ${Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-muted-foreground">
                        {payment.payment_method || '—'}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={getStatusColor(payment.status)}>
                        {getStatusLabel(payment.status)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {payment.attachments && Array.isArray(payment.attachments) && payment.attachments.length > 0 ? (
                          <>
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {payment.attachments.length} file{payment.attachments.length !== 1 ? 's' : ''}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setDialogOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    No payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedPayment && (
        <PaymentDetailsDialog
          payment={selectedPayment}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
