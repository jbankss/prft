import { useState, useEffect } from 'react';
import { Activity, Upload, Trash2, Edit, Eye, FolderPlus, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string;
  created_at: string;
  metadata: any;
  profiles?: {
    full_name: string | null;
  };
}

export function ActivityFeedCard() {
  const { currentBrand } = useBrandContext();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBrand) {
      fetchActivities();

      const channel = supabase
        .channel('activity-feed-card')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'creative_activity_logs',
            filter: `brand_id=eq.${currentBrand.id}`,
          },
          () => fetchActivities()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentBrand]);

  const fetchActivities = async () => {
    if (!currentBrand) return;

    try {
      const { data, error } = await supabase
        .from('creative_activity_logs')
        .select('*, profiles(full_name)')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('upload')) return <Upload className="h-3.5 w-3.5 text-emerald-500" />;
    if (action.includes('delete')) return <Trash2 className="h-3.5 w-3.5 text-red-500" />;
    if (action.includes('edit') || action.includes('update')) return <Edit className="h-3.5 w-3.5 text-blue-500" />;
    if (action.includes('view')) return <Eye className="h-3.5 w-3.5 text-purple-500" />;
    if (action.includes('collection')) return <FolderPlus className="h-3.5 w-3.5 text-amber-500" />;
    if (action.includes('download')) return <Download className="h-3.5 w-3.5 text-cyan-500" />;
    return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getActionDescription = (activity: ActivityLog): string => {
    const userName = activity.profiles?.full_name?.split(' ')[0] || 'Someone';
    const fileName = activity.metadata?.file_name || 'an asset';

    switch (activity.action) {
      case 'uploaded_asset':
        return `${userName} uploaded ${fileName}`;
      case 'deleted_asset':
        return `${userName} deleted ${fileName}`;
      case 'updated_asset':
        return `${userName} updated ${fileName}`;
      case 'viewed_asset':
        return `${userName} viewed ${fileName}`;
      case 'created_collection':
        return `${userName} created a collection`;
      case 'downloaded_asset':
        return `${userName} downloaded ${fileName}`;
      default:
        return `${userName} ${activity.action.replace(/_/g, ' ')}`;
    }
  };

  const getInitials = (name: string | null): string => {
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
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <h3 className="font-semibold">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Recent Activity</h3>
          <p className="text-xs text-muted-foreground">
            Latest actions in your library
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No activity yet. Upload your first asset to get started!
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[240px] pr-4">
          <div className="space-y-1">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-muted">
                    {getInitials(activity.profiles?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {getActionDescription(activity)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-muted/50">
                  {getActionIcon(activity.action)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
