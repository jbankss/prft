import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMockupMode } from '@/hooks/useMockupMode';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Settings, HelpCircle, LogOut, Circle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
}

export function UserProfileDropdown() {
  const { user, signOut } = useAuth();
  const { mockupMode, setMockupMode } = useMockupMode();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', user!.id);

      if (error) throw error;
      setProfile((prev) => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Status changed to ${newStatus}`);
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleMockupToggle = async () => {
    const newValue = !mockupMode;
    await setMockupMode(newValue);
    toast.success(newValue ? 'Demo mode enabled' : 'Demo mode disabled');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      case 'remote': return 'text-blue-500';
      case 'vacation': return 'text-purple-500';
      default: return 'text-muted-foreground';
    }
  };

  if (!profile) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-full">
          <Avatar className="h-10 w-10 ring-2 ring-border hover:ring-primary transition-all cursor-pointer">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
            profile.status === 'online' ? 'bg-green-500' :
            profile.status === 'away' ? 'bg-yellow-500' :
            profile.status === 'remote' ? 'bg-blue-500' :
            profile.status === 'vacation' ? 'bg-purple-500' :
            'bg-muted'
          }`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile.full_name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {profile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Mockup Mode Toggle */}
        <div 
          className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
          onClick={handleMockupToggle}
        >
          <div className="flex items-center gap-2">
            <Sparkles className={`h-4 w-4 ${mockupMode ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-sm">Demo Mode</span>
          </div>
          <Switch 
            checked={mockupMode} 
            onCheckedChange={handleMockupToggle}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/user-settings')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Circle className={`mr-2 h-4 w-4 fill-current ${getStatusColor(profile.status)}`} />
            Change Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleStatusChange('online')} className="cursor-pointer">
              <Circle className="mr-2 h-4 w-4 fill-current text-green-500" />
              Online
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('away')} className="cursor-pointer">
              <Circle className="mr-2 h-4 w-4 fill-current text-yellow-500" />
              Away
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('remote')} className="cursor-pointer">
              <Circle className="mr-2 h-4 w-4 fill-current text-blue-500" />
              Remote
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('vacation')} className="cursor-pointer">
              <Circle className="mr-2 h-4 w-4 fill-current text-purple-500" />
              Vacation
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem 
          onClick={() => window.open('https://docs.lovable.dev', '_blank')} 
          className="cursor-pointer"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          Help
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}