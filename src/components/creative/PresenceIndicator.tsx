import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserPresence {
  user_id: string;
  user_name: string;
  avatar_url?: string;
}

interface PresenceIndicatorProps {
  viewers: UserPresence[];
  maxDisplay?: number;
}

export function PresenceIndicator({ viewers, maxDisplay = 3 }: PresenceIndicatorProps) {
  if (viewers.length === 0) return null;

  const displayedViewers = viewers.slice(0, maxDisplay);
  const remainingCount = viewers.length - maxDisplay;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {displayedViewers.map((viewer) => (
          <Tooltip key={viewer.user_id}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-primary/20 presence-ring">
                  <AvatarImage src={viewer.avatar_url} alt={viewer.user_name} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {viewer.user_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{viewer.user_name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                <span className="text-xs font-medium">+{remainingCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{remainingCount} more viewing</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
