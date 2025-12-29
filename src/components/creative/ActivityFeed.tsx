import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, CheckCircle, XCircle, MessageSquare, FileText, Image, FolderPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string;
  brand_id: string;
  metadata: any;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function ActivityFeed() {
  const { currentBrand } = useBrandContext();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    if (!currentBrand) return;

    try {
      const { data, error } = await supabase
        .from('creative_activity_logs')
        .select('*, profiles(full_name, avatar_url)')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBrand) {
      fetchActivities();

      // Real-time subscription
      const channel = supabase
        .channel('creative-activity-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'creative_activity_logs',
            filter: `brand_id=eq.${currentBrand.id}`,
          },
          () => {
            fetchActivities();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentBrand]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'uploaded_asset':
        return <Upload className="h-4 w-4 text-primary" />;
      case 'approved_session':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected_session':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'created_collection':
        return <FolderPlus className="h-4 w-4 text-blue-500" />;
      case 'updated_asset':
        return <Image className="h-4 w-4 text-amber-500" />;
      case 'deleted_asset':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionDescription = (activity: ActivityLog): string => {
    const metadata = activity.metadata || {};
    const userName = activity.profiles?.full_name || 'Someone';

    switch (activity.action) {
      case 'uploaded_asset':
        if (metadata.session_title && metadata.file_count) {
          return `${userName} uploaded "${metadata.session_title}" containing ${metadata.file_count} items`;
        }
        return `${userName} uploaded an asset`;
      case 'approved_session':
        return `${userName} approved "${metadata.session_title || 'upload session'}"`;
      case 'rejected_session':
        return `${userName} rejected "${metadata.session_title || 'upload session'}"`;
      case 'created_collection':
        return `${userName} created collection "${metadata.collection_name || 'New Collection'}"`;
      case 'updated_collection':
        return `${userName} updated collection "${metadata.collection_name || 'collection'}"`;
      case 'updated_asset':
        return `${userName} updated "${metadata.asset_title || 'asset'}"`;
      case 'deleted_asset':
        return `${userName} deleted "${metadata.asset_title || 'asset'}"`;
      case 'deleted_collection':
        return `${userName} deleted collection "${metadata.collection_name || 'collection'}"`;
      default:
        return `${userName} performed an action`;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No recent activity</p>
          <p className="text-sm text-muted-foreground mt-1">
            Activity will appear here as your team works
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 group">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(activity.profiles?.full_name || null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getActionIcon(activity.action)}
                  <p className="text-sm text-foreground truncate">
                    {getActionDescription(activity)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
