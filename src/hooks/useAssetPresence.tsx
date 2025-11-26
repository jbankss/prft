import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UserPresence {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  viewing_asset_id?: string;
}

export function useAssetPresence(assetId?: string) {
  const { user } = useAuth();
  const [viewers, setViewers] = useState<UserPresence[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    const roomChannel = supabase.channel('creative-presence');

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState<UserPresence>();
        const allUsers = Object.values(state).flat();
        
        if (assetId) {
          setViewers(allUsers.filter(u => u.viewing_asset_id === assetId));
        } else {
          setViewers(allUsers);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single();

          await roomChannel.track({
            user_id: user.id,
            user_name: profile?.full_name || user.email || 'Anonymous',
            avatar_url: profile?.avatar_url,
            viewing_asset_id: assetId,
          });
        }
      });

    setChannel(roomChannel);

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [user, assetId]);

  const updateViewingAsset = async (newAssetId?: string) => {
    if (!channel || !user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    await channel.track({
      user_id: user.id,
      user_name: profile?.full_name || user.email || 'Anonymous',
      avatar_url: profile?.avatar_url,
      viewing_asset_id: newAssetId,
    });
  };

  return { viewers, updateViewingAsset };
}
