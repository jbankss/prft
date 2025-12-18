import { cn } from '@/lib/utils';

interface AssistantAvatarProps {
  isThinking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AssistantAvatar({ isThinking = false, size = 'md', className }: AssistantAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div 
      className={cn(
        'relative rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg',
        sizeClasses[size],
        isThinking && 'animate-pulse',
        className
      )}
    >
      {/* Face container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Eyes */}
        <div className="absolute flex gap-2" style={{ top: '35%' }}>
          <div 
            className={cn(
              'bg-white rounded-full transition-all duration-300',
              size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5',
              isThinking && 'animate-bounce'
            )}
            style={{ animationDelay: '0ms' }}
          />
          <div 
            className={cn(
              'bg-white rounded-full transition-all duration-300',
              size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5',
              isThinking && 'animate-bounce'
            )}
            style={{ animationDelay: '150ms' }}
          />
        </div>
        
        {/* Mouth */}
        <div 
          className={cn(
            'absolute bg-white rounded-full transition-all duration-300',
            size === 'sm' ? 'w-3 h-1' : size === 'md' ? 'w-4 h-1.5' : 'w-5 h-2',
            isThinking ? 'w-2 h-2 rounded-full' : 'rounded-full'
          )}
          style={{ top: '55%' }}
        />
      </div>

      {/* Glow effect when thinking */}
      {isThinking && (
        <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
      )}
      
      {/* Notification dot */}
      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
    </div>
  );
}
