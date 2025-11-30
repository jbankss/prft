import { Card } from '@/components/ui/card';
import { Clock, Store, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentOrdersFeedProps {
  orders: {
    orderNumber: string;
    vendor: string;
    amount: number;
    time: string;
    source: string;
  }[];
}

export function RecentOrdersFeed({ orders }: RecentOrdersFeedProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Orders</h3>
        <Clock className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {orders.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No recent orders
          </div>
        ) : (
          orders.map((order, index) => {
            const isPOS = order.source?.toLowerCase().includes('pos');
            const Icon = isPOS ? Store : Globe;

            return (
              <div key={`${order.orderNumber}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {order.orderNumber}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {order.vendor}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-bold">
                    ${order.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(order.time), { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
