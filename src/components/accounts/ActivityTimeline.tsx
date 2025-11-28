import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash, 
  DollarSign, 
  FileText, 
  MessageSquare,
  User,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  changes: any;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export function ActivityTimeline({ brandId }: { brandId: string }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    const channel = supabase
      .channel('activity-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, fetchActivities)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
      case 'create':
        return <Plus className="h-4 w-4" />;
      case 'updated':
      case 'update':
        return <Edit className="h-4 w-4" />;
      case 'deleted':
      case 'delete':
        return <Trash className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'account':
        return <User className="h-4 w-4" />;
      case 'charge':
        return <DollarSign className="h-4 w-4" />;
      case 'invoice':
        return <FileText className="h-4 w-4" />;
      case 'chat_message':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
      case 'create':
        return 'bg-green-500/10 text-green-500';
      case 'updated':
      case 'update':
        return 'bg-blue-500/10 text-blue-500';
      case 'deleted':
      case 'delete':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={`p-2 rounded-lg ${getActionColor(activity.action)} flex-shrink-0`}>
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        {getEntityIcon(activity.entity_type)}
                        {activity.entity_type}
                      </Badge>
                      <span className="font-medium">{activity.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {activity.profiles && (
                    <p className="text-sm text-muted-foreground">
                      by {activity.profiles.full_name || activity.profiles.email}
                    </p>
                  )}
                  {activity.changes && (
                    <div className="mt-2 text-xs text-muted-foreground bg-background/50 p-2 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(activity.changes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No activity recorded yet
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
