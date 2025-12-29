import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, Sunrise, Sunset, Coffee } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
  const [time, setTime] = useState(new Date());
  const [greetingData, setGreetingData] = useState(() => getTimeGreeting(new Date().getHours()));
  const [hasEntered, setHasEntered] = useState(false);

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

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const amPm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return (
    <div 
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card rounded-3xl border border-border transition-all duration-700",
        hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* Greeting Section */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10">
          {greetingData.icon}
        </div>
        <div>
          <p className="text-muted-foreground text-sm">
            {greetingData.greeting}
          </p>
          <h2 className="text-2xl font-display font-semibold">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h2>
        </div>
      </div>

      {/* Clock Section */}
      <div 
        className={cn(
          "flex items-center gap-3 transition-all duration-700 delay-100",
          hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {format(time, 'EEEE, MMMM d')}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tabular-nums font-display">
              {hour12}:{minutes.toString().padStart(2, '0')}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {amPm}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
