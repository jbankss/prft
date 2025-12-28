import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Sun, Moon, Package, X, Sunrise, Sunset, Coffee, Star } from 'lucide-react';
import { useStckMetrics } from '@/hooks/useStckMetrics';
import { useAuth } from '@/hooks/useAuth';
import { useBrandContext } from '@/hooks/useBrandContext';
import { cn } from '@/lib/utils';

const TIME_GREETINGS = {
  earlyMorning: [
    "Early bird gets the worm",
    "Rise and grind",
    "The world is quiet, let's make moves",
  ],
  morning: [
    "Good morning",
    "Fresh start today",
    "Let's make today count",
  ],
  afternoon: [
    "Good afternoon",
    "Keep the momentum going",
    "Halfway through, staying strong",
  ],
  evening: [
    "Good evening",
    "Wrapping up nicely",
    "Another day, another win",
  ],
  night: [
    "Burning the midnight oil",
    "Night owl mode activated",
    "The quiet hours are for building",
  ],
};

function getTimeGreeting(hour: number): { greeting: string; icon: React.ReactNode } {
  let greetings: string[];
  let icon: React.ReactNode;

  if (hour >= 5 && hour < 7) {
    greetings = TIME_GREETINGS.earlyMorning;
    icon = <Sunrise className="h-5 w-5" />;
  } else if (hour >= 7 && hour < 12) {
    greetings = TIME_GREETINGS.morning;
    icon = <Coffee className="h-5 w-5" />;
  } else if (hour >= 12 && hour < 17) {
    greetings = TIME_GREETINGS.afternoon;
    icon = <Sun className="h-5 w-5" />;
  } else if (hour >= 17 && hour < 21) {
    greetings = TIME_GREETINGS.evening;
    icon = <Sunset className="h-5 w-5" />;
  } else {
    greetings = TIME_GREETINGS.night;
    icon = <Moon className="h-5 w-5" />;
  }

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  return { greeting: randomGreeting, icon };
}

export default function Stck() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBrand } = useBrandContext();
  const { funFacts, newOrder, recentOrders } = useStckMetrics();
  
  const [time, setTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(() => {
    return localStorage.getItem('stck-24h') === 'true';
  });
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const [greetingData, setGreetingData] = useState(() => getTimeGreeting(new Date().getHours()));

  // Get user's first name
  const firstName = useMemo(() => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return '';
  }, [user]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Update greeting every hour
  useEffect(() => {
    const checkHour = () => {
      const currentHour = new Date().getHours();
      setGreetingData(getTimeGreeting(currentHour));
    };
    
    const interval = setInterval(checkHour, 60000); // Check every minute
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

  // Exit on key press
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

  const formatHour = (h: number) => {
    if (is24Hour) return h.toString().padStart(2, '0');
    const hour12 = h % 12 || 12;
    return hour12.toString();
  };

  const amPm = hours >= 12 ? 'PM' : 'AM';
  const currentFact = funFacts[currentFactIndex];

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary to-muted animate-gradient" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
      
      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

      {/* Content container */}
      <div className="relative z-10 h-full flex flex-col">
        
        {/* Header - Logo and Exit */}
        <div className="flex items-center justify-between p-6 lg:p-10">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            {currentBrand?.logo_url ? (
              <img 
                src={currentBrand.logo_url} 
                alt={currentBrand.name} 
                className="h-10 w-auto object-contain opacity-80"
              />
            ) : currentBrand?.name ? (
              <div className="flex items-center gap-2 text-foreground/60">
                <Star className="h-5 w-5" />
                <span className="text-sm font-medium tracking-wide">{currentBrand.name}</span>
              </div>
            ) : null}
          </div>

          {/* Exit button */}
          <button
            onClick={handleExit}
            className="p-3 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all duration-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main content - centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
          
          {/* Time-based greeting */}
          <div className="flex items-center gap-3 mb-6 text-muted-foreground">
            {greetingData.icon}
            <span className="text-lg font-light tracking-wide">
              {greetingData.greeting}{firstName ? `, ${firstName}` : ''}
            </span>
          </div>

          {/* Date */}
          <div className="mb-4">
            <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground/60">
              {format(time, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          {/* Giant clock */}
          <div className="flex items-baseline font-bold tracking-tighter mb-8">
            <span className="text-[16rem] lg:text-[20rem] leading-none text-foreground tabular-nums drop-shadow-sm">
              {formatHour(hours)}
            </span>
            <span className="text-[12rem] lg:text-[16rem] leading-none text-foreground/30 mx-2 animate-pulse">
              :
            </span>
            <span className="text-[16rem] lg:text-[20rem] leading-none text-foreground tabular-nums drop-shadow-sm">
              {minutes.toString().padStart(2, '0')}
            </span>
            <div className="flex flex-col ml-6 gap-1">
              <span className="text-[3rem] lg:text-[4rem] leading-none text-muted-foreground/40 tabular-nums font-medium">
                {seconds.toString().padStart(2, '0')}
              </span>
              {!is24Hour && (
                <span className="text-lg font-medium text-muted-foreground/40 tracking-wider">
                  {amPm}
                </span>
              )}
            </div>
          </div>

          {/* 12h/24h toggle */}
          <div className="flex items-center gap-1 bg-foreground/5 rounded-full p-1 backdrop-blur-sm">
            <button
              onClick={() => setIs24Hour(false)}
              className={cn(
                'px-4 py-2 text-xs font-medium rounded-full transition-all duration-300',
                !is24Hour 
                  ? 'bg-foreground text-background shadow-lg' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              12h
            </button>
            <button
              onClick={() => setIs24Hour(true)}
              className={cn(
                'px-4 py-2 text-xs font-medium rounded-full transition-all duration-300',
                is24Hour 
                  ? 'bg-foreground text-background shadow-lg' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              24h
            </button>
          </div>
        </div>

        {/* Bottom section */}
        <div className="p-6 lg:p-10">
          
          {/* Fun fact - centered */}
          <div className="flex justify-center mb-8">
            <div
              className={cn(
                'flex items-center gap-4 px-8 py-4 bg-foreground/5 backdrop-blur-sm rounded-2xl border border-foreground/5 transition-all duration-500',
                factVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              )}
            >
              <span className="text-2xl">{currentFact?.emoji}</span>
              <span className="text-sm font-medium text-foreground/70">
                {currentFact?.text}
              </span>
            </div>
          </div>

          {/* Bottom row - Recent orders and new order notification */}
          <div className="flex items-end justify-between">
            
            {/* Recent orders (left) */}
            <div className="flex flex-col gap-2 opacity-50 hover:opacity-80 transition-opacity duration-300">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Recent Orders</span>
              {recentOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-medium">#{order.order_number}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>${order.total_amount?.toFixed(0)}</span>
                </div>
              ))}
            </div>

            {/* New order notification (right) */}
            {newOrder && (
              <div className="animate-in slide-in-from-right-5 duration-500">
                <div className="flex items-center gap-4 px-5 py-4 bg-primary text-primary-foreground rounded-2xl shadow-xl">
                  <div className="p-2 bg-primary-foreground/20 rounded-xl">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">New Order</span>
                    <span className="text-xs opacity-80">
                      #{newOrder.order_number} • ${newOrder.total_amount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}