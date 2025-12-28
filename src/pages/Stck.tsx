import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Sun, Moon, Package, X } from 'lucide-react';
import { useStckMetrics } from '@/hooks/useStckMetrics';
import { cn } from '@/lib/utils';

export default function Stck() {
  const navigate = useNavigate();
  const { funFacts, newOrder, recentOrders } = useStckMetrics();
  
  const [time, setTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(() => {
    return localStorage.getItem('stck-24h') === 'true';
  });
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotate fun facts
  useEffect(() => {
    if (funFacts.length <= 1) return;

    const interval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setCurrentFactIndex(prev => (prev + 1) % funFacts.length);
        setFactVisible(true);
      }, 500);
    }, 8000);

    return () => clearInterval(interval);
  }, [funFacts.length]);

  // Save 24h preference
  useEffect(() => {
    localStorage.setItem('stck-24h', String(is24Hour));
  }, [is24Hour]);

  // Exit on key press or click
  const handleExit = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExit]);

  // Format time
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const isNight = hours < 6 || hours >= 20;

  const formatHour = (h: number) => {
    if (is24Hour) return h.toString().padStart(2, '0');
    const hour12 = h % 12 || 12;
    return hour12.toString();
  };

  const amPm = hours >= 12 ? 'PM' : 'AM';
  const currentFact = funFacts[currentFactIndex];

  return (
    <div className="fixed inset-0 bg-secondary flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Exit button */}
      <button
        onClick={handleExit}
        className="absolute top-6 right-6 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Main clock area */}
      <div className="flex flex-col items-center gap-4">
        {/* Date */}
        <div className="flex items-center gap-3 text-muted-foreground">
          {isNight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="text-sm font-medium tracking-wide">
            {format(time, 'EEEE, MMM d yyyy')}
          </span>
        </div>

        {/* Giant clock */}
        <div className="flex items-baseline font-bold tracking-tighter">
          <span className="text-[12rem] leading-none text-foreground tabular-nums">
            {formatHour(hours)}
          </span>
          <span className="text-[10rem] leading-none text-muted-foreground/60 mx-1 animate-pulse">
            :
          </span>
          <span className="text-[12rem] leading-none text-foreground tabular-nums">
            {minutes.toString().padStart(2, '0')}
          </span>
          <span className="text-[4rem] leading-none text-muted-foreground/40 ml-4 tabular-nums">
            {seconds.toString().padStart(2, '0')}
          </span>
        </div>

        {/* 12h/24h toggle */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setIs24Hour(false)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-all',
              !is24Hour 
                ? 'bg-foreground text-background' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            12h
          </button>
          <button
            onClick={() => setIs24Hour(true)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-all',
              is24Hour 
                ? 'bg-foreground text-background' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            24h
          </button>
          {!is24Hour && (
            <span className="text-sm font-medium text-muted-foreground ml-2">
              {amPm}
            </span>
          )}
        </div>
      </div>

      {/* Fun fact */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
        <div
          className={cn(
            'flex items-center gap-3 px-6 py-3 bg-muted/50 rounded-full transition-all duration-500',
            factVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
        >
          <span className="text-xl">{currentFact?.emoji}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {currentFact?.text}
          </span>
        </div>
      </div>

      {/* New order notification */}
      {newOrder && (
        <div className="absolute bottom-6 right-6 animate-in slide-in-from-right-5 duration-300">
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-xl shadow-lg">
            <Package className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">New Order</span>
              <span className="text-xs opacity-80">
                #{newOrder.order_number} • ${newOrder.total_amount?.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent orders (subtle, bottom left) */}
      <div className="absolute bottom-6 left-6">
        <div className="flex flex-col gap-1.5 opacity-40 hover:opacity-80 transition-opacity">
          {recentOrders.slice(0, 3).map((order, idx) => (
            <div key={order.id} className="text-xs text-muted-foreground">
              <span className="font-medium">#{order.order_number}</span>
              <span className="mx-1.5">•</span>
              <span>${order.total_amount?.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
