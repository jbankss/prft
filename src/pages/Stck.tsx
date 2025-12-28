import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Sun, Moon, Package, X, Sunrise, Sunset, Coffee, Star, Camera } from 'lucide-react';
import { useStckMetrics } from '@/hooks/useStckMetrics';
import { useAuth } from '@/hooks/useAuth';
import { useBrandContext } from '@/hooks/useBrandContext';
import { useUnsplashBackground } from '@/hooks/useUnsplashBackground';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const TIME_GREETINGS = {
  earlyMorning: [
    "Early bird gets the worm",
    "Rise and grind",
    "The world is quiet, let's make moves",
    "Nobody else is awake, let's get rich",
    "Sleep is for closers... wait",
  ],
  morning: [
    "Good morning",
    "Fresh start today",
    "Let's make today count",
    "Coffee's hot, orders are hotter",
    "Time to stack some paper",
  ],
  afternoon: [
    "Good afternoon",
    "Keep the momentum going",
    "Halfway through, staying strong",
    "Money printer go brrr",
    "Crushing it, one order at a time",
  ],
  evening: [
    "Good evening",
    "Wrapping up nicely",
    "Another day, another win",
    "Almost quittin' time... but not yet",
    "Evening orders hit different",
  ],
  night: [
    "Burning the midnight oil",
    "Night owl mode activated",
    "The quiet hours are for building",
    "While they sleep, we ship",
    "Nocturnal and profitable",
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
  const { currentImage, nextImage, isTransitioning } = useUnsplashBackground();
  const isMobile = useIsMobile();
  
  const [time, setTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(() => {
    return localStorage.getItem('stck-24h') === 'true';
  });
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const [greetingData, setGreetingData] = useState(() => getTimeGreeting(new Date().getHours()));
  
  // Animation states
  const [isExiting, setIsExiting] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

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

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Update greeting every 20 minutes
  useEffect(() => {
    const checkGreeting = () => {
      const currentHour = new Date().getHours();
      setGreetingData(getTimeGreeting(currentHour));
    };
    
    const interval = setInterval(checkGreeting, 1200000); // 20 minutes
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

  // Exit with animation
  const handleExit = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      navigate('/');
    }, 600); // Match stck-exit animation duration
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
    <div 
      className={cn(
        "fixed inset-0 overflow-hidden select-none bg-black",
        isExiting ? "stck-exit" : hasEntered ? "stck-enter" : "opacity-0"
      )}
    >
      {/* Background image layer - current */}
      {currentImage && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${currentImage.url})` }}
        />
      )}
      
      {/* Background image layer - next (for crossfade) */}
      {nextImage && isTransitioning && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-0 animate-fade-in"
          style={{ 
            backgroundImage: `url(${nextImage.url})`,
            animationDuration: '2s',
          }}
        />
      )}

      {/* Fallback gradient (shows only when no images at all) */}
      {!currentImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary to-muted animate-gradient" />
      )}
      
      {/* Dark gradient overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
      
      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

      {/* Content container with staggered animations */}
      <div className="relative z-10 h-full flex flex-col">
        
        {/* Header - Logo and Exit */}
        <div 
          className={cn(
            "flex items-center justify-between p-6 lg:p-10 transition-all duration-700 ease-elegant",
            hasEntered && !isExiting ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}
          style={{ transitionDelay: hasEntered ? '0.2s' : '0s' }}
        >
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            {currentBrand?.logo_url ? (
              <img 
                src={currentBrand.logo_url} 
                alt={currentBrand.name} 
                className="h-10 w-auto object-contain opacity-90 drop-shadow-lg"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            ) : currentBrand?.name ? (
              <div className="flex items-center gap-2 text-white/70">
                <Star className="h-5 w-5" />
                <span className="text-sm font-medium tracking-wide">{currentBrand.name}</span>
              </div>
            ) : null}
          </div>

          {/* Exit button */}
          <button
            onClick={handleExit}
            className="p-3 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 backdrop-blur-sm hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main content - centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
          
          {/* Time-based greeting */}
          <div 
            className={cn(
              "flex items-center gap-3 mb-6 text-white/70 transition-all duration-700 ease-elegant",
              hasEntered && !isExiting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: hasEntered ? '0.3s' : '0s' }}
          >
            {greetingData.icon}
            <span className="text-lg font-light tracking-wide">
              {greetingData.greeting}{firstName ? `, ${firstName}` : ''}
            </span>
          </div>

          {/* Date */}
          <div 
            className={cn(
              "mb-4 transition-all duration-700 ease-elegant",
              hasEntered && !isExiting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: hasEntered ? '0.35s' : '0s' }}
          >
            <span className="text-xs md:text-sm font-medium tracking-widest uppercase text-white/50">
              {format(time, isMobile ? 'EEE, MMM d' : 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          {/* Giant clock */}
          <div 
            className={cn(
              "flex items-baseline font-bold tracking-tighter mb-6 md:mb-8 transition-all duration-700 ease-elegant",
              hasEntered && !isExiting ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
            style={{ 
              textShadow: '0 0 60px rgba(255,255,255,0.3), 0 0 120px rgba(255,255,255,0.1)',
              transitionDelay: hasEntered ? '0.4s' : '0s'
            }}
          >
            <span className={cn(
              "leading-none text-white tabular-nums drop-shadow-2xl",
              isMobile ? "text-[5rem]" : "text-[16rem] lg:text-[20rem]"
            )}>
              {formatHour(hours)}
            </span>
            <span className={cn(
              "leading-none text-white/40 mx-1 md:mx-2 animate-pulse",
              isMobile ? "text-[4rem]" : "text-[12rem] lg:text-[16rem]"
            )}>
              :
            </span>
            <span className={cn(
              "leading-none text-white tabular-nums drop-shadow-2xl",
              isMobile ? "text-[5rem]" : "text-[16rem] lg:text-[20rem]"
            )}>
              {minutes.toString().padStart(2, '0')}
            </span>
            {/* Seconds + AM/PM - hidden on mobile */}
            {!isMobile && (
              <div className="flex flex-col ml-6 gap-1">
                <span className="text-[3rem] lg:text-[4rem] leading-none text-white/50 tabular-nums font-medium">
                  {seconds.toString().padStart(2, '0')}
                </span>
                {!is24Hour && (
                  <span className="text-lg font-medium text-white/40 tracking-wider">
                    {amPm}
                  </span>
                )}
              </div>
            )}
            {/* Mobile: Just AM/PM */}
            {isMobile && !is24Hour && (
              <span className="text-sm font-medium text-white/40 tracking-wider ml-2 self-center">
                {amPm}
              </span>
            )}
          </div>

          {/* 12h/24h toggle */}
          <div 
            className={cn(
              "flex items-center gap-1 bg-white/10 rounded-full p-1 backdrop-blur-md transition-all duration-700 ease-elegant",
              hasEntered && !isExiting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: hasEntered ? '0.5s' : '0s' }}
          >
            <button
              onClick={() => setIs24Hour(false)}
              className={cn(
                'px-4 py-2 text-xs font-medium rounded-full transition-all duration-300',
                !is24Hour 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-white/60 hover:text-white'
              )}
            >
              12h
            </button>
            <button
              onClick={() => setIs24Hour(true)}
              className={cn(
                'px-4 py-2 text-xs font-medium rounded-full transition-all duration-300',
                is24Hour 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-white/60 hover:text-white'
              )}
            >
              24h
            </button>
          </div>
        </div>

        {/* Bottom section */}
        <div 
          className={cn(
            "p-4 md:p-6 lg:p-10 transition-all duration-700 ease-elegant",
            hasEntered && !isExiting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: hasEntered ? '0.6s' : '0s' }}
        >
          
          {/* Fun fact - centered */}
          <div className="flex justify-center mb-4 md:mb-8">
            <div
              className={cn(
                'flex items-center gap-2 md:gap-4 px-4 md:px-8 py-3 md:py-4 bg-black/30 backdrop-blur-md rounded-xl md:rounded-2xl border border-white/10 transition-all duration-500 max-w-full',
                factVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              )}
            >
              <span className="text-xl md:text-2xl">{currentFact?.emoji}</span>
              <span className="text-xs md:text-sm font-medium text-white/80 line-clamp-2">
                {currentFact?.text}
              </span>
            </div>
          </div>

          {/* Bottom row - Attribution left, Recent orders right (desktop only) */}
          <div className={cn(
            "flex items-end",
            isMobile ? "justify-center" : "justify-between"
          )}>
            
            {/* Photo attribution - Unsplash requirement */}
            {currentImage && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-sm rounded-lg",
                isMobile && "text-center"
              )}>
                <Camera className="h-3 w-3 text-white/50" />
                <span className="text-white/50 text-[10px] md:text-xs">Photo by</span>
                <a 
                  href={currentImage.photographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 text-[10px] md:text-xs font-medium hover:text-white hover:underline transition-colors"
                >
                  {currentImage.photographer}
                </a>
                <span className="text-[8px] md:text-[10px] text-white/20">on</span>
                <a 
                  href={currentImage.unsplashUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 text-[10px] md:text-xs font-medium hover:text-white hover:underline transition-colors"
                >
                  Unsplash
                </a>
              </div>
            )}

            {/* Recent orders + New order notification (right) - Desktop only */}
            {!isMobile && (
              <div className="flex items-end gap-6">
                {/* Recent orders */}
                <div className="flex flex-col gap-2 opacity-50 hover:opacity-80 transition-opacity duration-300">
                  <span className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Recent Orders</span>
                  {recentOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="text-xs text-white/70 flex items-center gap-2">
                      <span className="font-medium">#{order.order_number}</span>
                      <span className="text-white/30">•</span>
                      <span>${order.total_amount?.toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                {/* New order notification */}
                {newOrder && (
                  <div className="animate-in slide-in-from-right-5 duration-500">
                    <div className="flex items-center gap-4 px-5 py-4 bg-white text-black rounded-2xl shadow-xl">
                      <div className="p-2 bg-black/10 rounded-xl">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">New Order</span>
                        <span className="text-xs opacity-70">
                          #{newOrder.order_number} • ${newOrder.total_amount?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
