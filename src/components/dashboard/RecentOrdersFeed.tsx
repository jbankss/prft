import { Card } from '@/components/ui/card';
import { Clock, Store, Globe, Video, ArrowRight } from 'lucide-react';
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
  const getSourceIcon = (source: string) => {
    const s = source?.toLowerCase() || '';
    if (s.includes('pos')) return Store;
    if (s.includes('tiktok')) return Video;
    return Globe;
  };

  const getSourceLabel = (source: string) => {
    const s = source?.toLowerCase() || '';
    if (s.includes('pos')) return 'POS';
    if (s.includes('tiktok')) return 'TikTok';
    return 'Online';
  };

  // Show more orders
  const displayOrders = orders.slice(0, 12);

  return (
    <Card className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Orders</h3>
        <Clock className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No recent orders</p>
            <p className="text-xs text-muted-foreground mt-1">Orders will appear here as they come in</p>
          </div>
        ) : (
          displayOrders.map((order, index) => {
            const Icon = getSourceIcon(order.source);
            const sourceLabel = getSourceLabel(order.source);

            return (
              <div 
                key={`${order.orderNumber}-${index}`} 
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {sourceLabel}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate pl-5">
                    {order.vendor}
                  </div>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-sm font-bold">
                    ${order.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(order.time), { addSuffix: true })}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors ml-2" />
              </div>
            );
          })
        )}
      </div>

      {orders.length > 12 && (
        <div className="pt-3 border-t border-border mt-3">
          <button className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
            View all {orders.length} orders
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </Card>
  );
}
