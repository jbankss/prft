import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ThemeName = 'default' | 'midnight' | 'luxury' | 'fresh' | 'bold' | 'ocean';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => Promise<void>;
  themes: { id: ThemeName; name: string; description: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: { id: ThemeName; name: string; description: string }[] = [
  { id: 'default', name: 'Classic', description: 'Warm cream, professional' },
  { id: 'midnight', name: 'Midnight', description: 'Pure dark mode' },
  { id: 'luxury', name: 'Luxury', description: 'Gold accents, premium feel' },
  { id: 'fresh', name: 'Fresh', description: 'Green & teal vibes' },
  { id: 'bold', name: 'Bold', description: 'High contrast, vibrant' },
  { id: 'ocean', name: 'Ocean', description: 'Cool blue tones' },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeName>('default');

  useEffect(() => {
    // Load theme from profile
    const loadTheme = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', user.id)
        .single();
      
      if (data?.theme_preference) {
        setThemeState(data.theme_preference as ThemeName);
        document.documentElement.setAttribute('data-theme', data.theme_preference);
      }
    };

    loadTheme();
  }, [user]);

  const setTheme = async (newTheme: ThemeName) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
