import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, Sunrise, Sunset, Coffee, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStckMetrics } from '@/hooks/useStckMetrics';
import { cn } from '@/lib/utils';

const TIME_GREETINGS = {
  earlyMorning: [
    "Early riser",
    "Fresh start ahead",
    "The quiet hours",
  ],
  morning: [
    "Good morning",
    "Let's create something",
    "Rise and design",
  ],
  afternoon: [
    "Good afternoon",
    "Keep the creativity flowing",
    "Afternoon inspiration",
  ],
  evening: [
    "Good evening",
    "Evening session",
    "Winding down beautifully",
  ],
  night: [
    "Night owl mode",
    "Late night creativity",
    "Burning the midnight oil",
  ],
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

export function FldrGreeting() {
  const { user } = useAuth();
  const { funFacts } = useStckMetrics();
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
      }, 500);
    }, 8000);

    return () => clearInterval(interval);
  }, [funFacts.length]);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const amPm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  const currentFact = funFacts[currentFactIndex];

  return (
    <div 
      className={cn(
        "flex flex-col items-center gap-6 py-8 md:py-12 transition-all duration-700",
        hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* Greeting with icon - subtle */}
      <div 
        className={cn(
          "flex items-center gap-2 text-muted-foreground transition-all duration-700 delay-100",
          hasEntered ? "opacity-100" : "opacity-0"
        )}
      >
        {greetingData.icon}
        <span className="text-sm font-medium">
          {greetingData.greeting}{firstName ? `, ${firstName}` : ''}
        </span>
      </div>

      {/* Date - small */}
      <p 
        className={cn(
          "text-xs text-muted-foreground/70 uppercase tracking-widest transition-all duration-700 delay-150",
          hasEntered ? "opacity-100" : "opacity-0"
        )}
      >
        {format(time, 'EEEE, MMMM d')}
      </p>

      {/* Giant centered clock with seconds */}
      <div 
        className={cn(
          "flex items-baseline justify-center transition-all duration-700 delay-200",
          hasEntered ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        <span className="text-[6rem] md:text-[10rem] lg:text-[14rem] font-bold tabular-nums font-display leading-none tracking-tighter text-foreground">
          {hour12}
        </span>
        <span className="text-[4rem] md:text-[7rem] lg:text-[10rem] font-bold text-muted-foreground/30 mx-1 animate-pulse leading-none">
          :
        </span>
        <span className="text-[6rem] md:text-[10rem] lg:text-[14rem] font-bold tabular-nums font-display leading-none tracking-tighter text-foreground">
          {minutes.toString().padStart(2, '0')}
        </span>
        <div className="flex flex-col ml-3 md:ml-4 gap-1">
          <span className="text-2xl md:text-4xl lg:text-5xl font-bold tabular-nums text-muted-foreground/50 leading-none">
            {seconds.toString().padStart(2, '0')}
          </span>
          <span className="text-xs md:text-sm font-medium text-muted-foreground/40 tracking-wider">
            {amPm}
          </span>
        </div>
      </div>

      {/* AI Insights - fun fact popup */}
      {currentFact && (
        <div 
          className={cn(
            "flex items-center gap-3 px-5 py-3 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm transition-all duration-500 max-w-md",
            hasEntered ? "opacity-100 translate-y-0 delay-300" : "opacity-0 translate-y-4",
            factVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentFact.emoji}</span>
            <span className="text-sm text-muted-foreground">{currentFact.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
