import { useTheme, themes, ThemeName } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const themeColors: Record<ThemeName, { primary: string; accent: string }> = {
  default: { primary: 'bg-stone-800', accent: 'bg-amber-500' },
  midnight: { primary: 'bg-slate-900', accent: 'bg-blue-500' },
  luxury: { primary: 'bg-zinc-900', accent: 'bg-amber-400' },
  fresh: { primary: 'bg-emerald-800', accent: 'bg-teal-400' },
  bold: { primary: 'bg-violet-700', accent: 'bg-pink-500' },
  ocean: { primary: 'bg-sky-800', accent: 'bg-cyan-400' },
};

export function ThemeSelector() {
  const { theme, setTheme, themes: themeList } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Theme</Label>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {themeList.map((t) => {
          const colors = themeColors[t.id];
          const isSelected = theme === t.id;
          
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "relative flex flex-col items-start p-3 rounded-xl border-2 transition-all duration-200",
                isSelected 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "border-border hover:border-primary/50"
              )}
            >
              {/* Color Preview */}
              <div className="flex gap-1.5 mb-2">
                <div className={cn("w-4 h-4 rounded-full", colors.primary)} />
                <div className={cn("w-4 h-4 rounded-full", colors.accent)} />
              </div>
              
              {/* Label */}
              <span className="text-sm font-medium">{t.name}</span>
              <span className="text-xs text-muted-foreground">{t.description}</span>
              
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
