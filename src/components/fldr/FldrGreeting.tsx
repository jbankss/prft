import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, Sunrise, Sunset, Coffee, Image, ExternalLink, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFldrMetrics } from '@/hooks/useFldrMetrics';
import { useFldrUnsplashBackground } from '@/hooks/useFldrUnsplashBackground';
import { useBrandContext } from '@/hooks/useBrandContext';
import { cn } from '@/lib/utils';

const TIME_GREETINGS = {
  earlyMorning: ["Early creator", "Dawn inspiration", "Fresh canvas"],
  morning: ["Good morning", "Create something", "Visual day ahead"],
  afternoon: ["Good afternoon", "Keep creating", "Afternoon vibes"],
  evening: ["Good evening", "Evening session", "Creative wind-down"],
  night: ["Night owl mode", "Midnight creativity", "Late night edits"],
};

function getTimeGreeting(hour: number): { greeting: string; icon: React.ReactNode } {
  let greetings: string[];
  let icon: React.ReactNode;

  if (hour >= 5 && hour < 7) {
    greetings = TIME_GREETINGS.earlyMorning;
    icon = <Sunrise className="h-5 w-5 text-amber-400" />;
  } else if (hour >= 7 && hour < 12) {
    greetings = TIME_GREETINGS.morning;
    icon = <Coffee className="h-5 w-5 text-orange-400" />;
  } else if (hour >= 12 && hour < 17) {
    greetings = TIME_GREETINGS.afternoon;
    icon = <Sun className="h-5 w-5 text-yellow-500" />;
  } else if (hour >= 17 && hour < 21) {
    greetings = TIME_GREETINGS.evening;
    icon = <Sunset className="h-5 w-5 text-orange-500" />;
  } else {
    greetings = TIME_GREETINGS.night;
    icon = <Moon className="h-5 w-5 text-indigo-400" />;
  }

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  return { greeting: randomGreeting, icon };
}

interface FldrGreetingProps {
  onExit?: () => void;
}

export function FldrGreeting({ onExit }: FldrGreetingProps) {
  const { user } = useAuth();
  const { currentBrand } = useBrandContext();
  const { funFacts } = useFldrMetrics();
  const { currentImage, isTransitioning } = useFldrUnsplashBackground();
  const [time, setTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(() => {
    return localStorage.getItem('fldr-24h') === 'true';
  });
  const [greetingData, setGreetingData] = useState(() => getTimeGreeting(new Date().getHours()));
  const [hasEntered, setHasEntered] = useState(false);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);

  const firstName = useMemo(() => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return '';
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkGreeting = () => {
      const currentHour = new Date().getHours();
      setGreetingData(getTimeGreeting(currentHour));
    };
    const interval = setInterval(checkGreeting, 1200000);
    return () => clearInterval(interval);
  }, []);

  // Save 24h preference
  useEffect(() => {
    localStorage.setItem('fldr-24h', String(is24Hour));
  }, [is24Hour]);

  // Rotate fun facts
  useEffect(() => {
    if (funFacts.length <= 1) return;

    const interval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setCurrentFactIndex(prev => (prev + 1) % funFacts.length);
        setFactVisible(true);
      }, 400);
    }, 6000);

    return () => clearInterval(interval);
  }, [funFacts.length]);

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
    <div className="relative overflow-hidden rounded-2xl">
      {/* Unsplash Banner Background */}
      <div className="absolute inset-0">
        {currentImage && (
          <img
            src={currentImage.url}
            alt="Background"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
              isTransitioning ? "opacity-0" : "opacity-100"
            )}
          />
        )}
        
        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
      </div>

      {/* Content - Stck-style layout */}
      <div 
        className={cn(
          "relative flex flex-col items-center py-12 px-6 transition-all duration-700",
          hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Header row - Logo left, Exit right */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            {currentBrand?.logo_url ? (
              <img 
                src={currentBrand.logo_url} 
                alt={currentBrand.name} 
                className="h-6 w-auto object-contain opacity-80"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            ) : null}
          </div>

          {/* Exit button */}
          {onExit && (
            <button
              onClick={onExit}
              className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Time-based greeting */}
        <div 
          className={cn(
            "flex items-center gap-2 mb-4 text-white/80 transition-all duration-700 delay-100",
            hasEntered ? "opacity-100" : "opacity-0"
          )}
        >
          {greetingData.icon}
          <span className="text-base font-medium tracking-wide">
            {greetingData.greeting}{firstName ? `, ${firstName}` : ''}
          </span>
        </div>

        {/* Date */}
        <div 
          className={cn(
            "mb-3 transition-all duration-700 delay-150",
            hasEntered ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="text-xs font-medium tracking-widest uppercase text-white/50">
            {format(time, 'EEEE, MMMM d')}
          </span>
        </div>

        {/* Large Clock - Stck style */}
        <div 
          className={cn(
            "flex items-baseline justify-center mb-6 transition-all duration-700 delay-200",
            hasEntered ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
          style={{ 
            textShadow: '0 0 40px rgba(255,255,255,0.2), 0 0 80px rgba(255,255,255,0.1)'
          }}
        >
          <span className="text-[6rem] md:text-[10rem] font-bold tabular-nums font-display leading-none tracking-tighter text-white drop-shadow-2xl">
            {formatHour(hours)}
          </span>
          <span className="text-[4rem] md:text-[7rem] font-bold text-white/40 mx-1 animate-pulse leading-none">
            :
          </span>
          <span className="text-[6rem] md:text-[10rem] font-bold tabular-nums font-display leading-none tracking-tighter text-white drop-shadow-2xl">
            {minutes.toString().padStart(2, '0')}
          </span>
          <div className="flex flex-col ml-3 gap-1">
            <span className="text-2xl md:text-4xl font-bold tabular-nums text-white/50 leading-none">
              {seconds.toString().padStart(2, '0')}
            </span>
            {!is24Hour && (
              <span className="text-xs md:text-sm font-medium text-white/40 tracking-wider">
                {amPm}
              </span>
            )}
          </div>
        </div>

        {/* 12h/24h toggle */}
        <div 
          className={cn(
            "flex items-center gap-1 bg-white/10 rounded-full p-1 backdrop-blur-md mb-6 transition-all duration-700 delay-250",
            hasEntered ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            onClick={() => setIs24Hour(false)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-300',
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
              'px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-300',
              is24Hour 
                ? 'bg-white text-black shadow-lg' 
                : 'text-white/60 hover:text-white'
            )}
          >
            24h
          </button>
        </div>

        {/* AI Insights - fldr specific */}
        {currentFact && (
          <div 
            className={cn(
              "flex items-center gap-3 px-5 py-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg transition-all duration-400 max-w-md",
              hasEntered ? "opacity-100 translate-y-0 delay-300" : "opacity-0 translate-y-2",
              factVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}
          >
            <div className="p-2 rounded-lg bg-white/10">
              <Image className="h-4 w-4 text-white/80" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentFact.emoji}</span>
              <span className="text-sm text-white/80 font-medium">{currentFact.text}</span>
            </div>
          </div>
        )}

        {/* Photographer attribution - Unsplash requirement */}
        {currentImage && (
          <a
            href={currentImage.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-1.5 mt-6 text-[10px] text-white/40 hover:text-white/60 transition-colors",
              hasEntered ? "opacity-100 delay-400" : "opacity-0"
            )}
          >
            <span>Photo by {currentImage.photographerName}</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}
