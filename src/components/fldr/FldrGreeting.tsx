import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, Sunrise, Sunset, Coffee, Image, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFldrMetrics } from '@/hooks/useFldrMetrics';
import { useFldrUnsplashBackground } from '@/hooks/useFldrUnsplashBackground';
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
    icon = <Sunrise className="h-4 w-4 text-amber-400" />;
  } else if (hour >= 7 && hour < 12) {
    greetings = TIME_GREETINGS.morning;
    icon = <Coffee className="h-4 w-4 text-orange-400" />;
  } else if (hour >= 12 && hour < 17) {
    greetings = TIME_GREETINGS.afternoon;
    icon = <Sun className="h-4 w-4 text-yellow-500" />;
  } else if (hour >= 17 && hour < 21) {
    greetings = TIME_GREETINGS.evening;
    icon = <Sunset className="h-4 w-4 text-orange-500" />;
  } else {
    greetings = TIME_GREETINGS.night;
    icon = <Moon className="h-4 w-4 text-indigo-400" />;
  }

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  return { greeting: randomGreeting, icon };
}

export function FldrGreeting() {
  const { user } = useAuth();
  const { funFacts } = useFldrMetrics();
  const { currentImage, isTransitioning } = useFldrUnsplashBackground();
  const [time, setTime] = useState(new Date());
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
  const amPm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  const currentFact = funFacts[currentFactIndex];

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Simple Rectangular Unsplash Banner */}
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
        
        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/80" />
      </div>

      {/* Content */}
      <div 
        className={cn(
          "relative flex flex-col items-center gap-4 py-10 px-6 transition-all duration-700",
          hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Greeting header with icon */}
        <div 
          className={cn(
            "flex items-center gap-2 text-foreground/80 transition-all duration-700 delay-100",
            hasEntered ? "opacity-100" : "opacity-0"
          )}
        >
          {greetingData.icon}
          <span className="text-sm font-medium">
            {greetingData.greeting}{firstName ? `, ${firstName}` : ''}
          </span>
          <span className="text-xs text-foreground/60 ml-2">
            {format(time, 'EEEE, MMM d')}
          </span>
        </div>

        {/* Compact clock */}
        <div 
          className={cn(
            "flex items-baseline justify-center transition-all duration-700 delay-150",
            hasEntered ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
        >
          <span className="text-5xl md:text-7xl font-bold tabular-nums font-display leading-none tracking-tight text-foreground">
            {hour12}
          </span>
          <span className="text-3xl md:text-5xl font-bold text-foreground/40 mx-0.5 animate-pulse leading-none">
            :
          </span>
          <span className="text-5xl md:text-7xl font-bold tabular-nums font-display leading-none tracking-tight text-foreground">
            {minutes.toString().padStart(2, '0')}
          </span>
          <div className="flex flex-col ml-2 gap-0.5">
            <span className="text-lg md:text-2xl font-bold tabular-nums text-foreground/50 leading-none">
              {seconds.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] md:text-xs font-medium text-foreground/40 tracking-wider">
              {amPm}
            </span>
          </div>
        </div>

        {/* AI Insights - fldr specific */}
        {currentFact && (
          <div 
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 bg-card/80 backdrop-blur-sm rounded-xl border border-border/40 shadow-sm transition-all duration-400 max-w-sm",
              hasEntered ? "opacity-100 translate-y-0 delay-200" : "opacity-0 translate-y-2",
              factVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}
          >
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Image className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">{currentFact.emoji}</span>
              <span className="text-xs text-muted-foreground">{currentFact.text}</span>
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
              "flex items-center gap-1.5 text-[10px] text-foreground/40 hover:text-foreground/60 transition-colors",
              hasEntered ? "opacity-100 delay-300" : "opacity-0"
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
