import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Upload, Trash2, User } from 'lucide-react';

interface UserStats {
  user_id: string;
  full_name: string;
  uploads: number;
  deletions: number;
  total_size: number;
}

export function AnalyticsView() {
  const { currentBrand } = useBrandContext();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalAssets: 0,
    totalUploads: 0,
    totalDeletions: 0,
    totalStorage: 0
  });

  useEffect(() => {
    if (currentBrand) {
      fetchAnalytics();
      fetchRecentActivity();
    }
  }, [currentBrand]);

  const fetchAnalytics = async () => {
    if (!currentBrand) return;

    try {
      // Get all assets
      const { data: assets } = await supabase
        .from('creative_assets')
        .select('*, profiles(full_name)')
        .eq('brand_id', currentBrand.id);

      // Get activity logs
      const { data: logs } = await supabase
        .from('creative_activity_logs')
        .select('*')
        .eq('brand_id', currentBrand.id);

      if (assets) {
        // Calculate user stats
        const userStatsMap: { [key: string]: UserStats } = {};
        
        assets.forEach(asset => {
          if (!asset.uploaded_by) return;
          
          if (!userStatsMap[asset.uploaded_by]) {
            userStatsMap[asset.uploaded_by] = {
              user_id: asset.uploaded_by,
              full_name: asset.profiles?.full_name || 'Unknown',
              uploads: 0,
              deletions: 0,
              total_size: 0
            };
          }
          
          userStatsMap[asset.uploaded_by].uploads++;
          userStatsMap[asset.uploaded_by].total_size += asset.file_size;
        });

        // Count deletions from logs
        if (logs) {
          logs.forEach(log => {
            if (log.action === 'deleted_asset' && userStatsMap[log.user_id]) {
              userStatsMap[log.user_id].deletions++;
            }
          });
        }

        setUserStats(Object.values(userStatsMap));

        // Calculate overall stats
        setOverallStats({
          totalAssets: assets.length,
          totalUploads: logs?.filter(l => l.action === 'uploaded_asset').length || 0,
          totalDeletions: logs?.filter(l => l.action === 'deleted_asset').length || 0,
          totalStorage: assets.reduce((sum, a) => sum + a.file_size, 0)
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    if (!currentBrand) return;

    try {
      const { data } = await supabase
        .from('creative_activity_logs')
        .select('*, profiles(full_name)')
        .eq('brand_id', currentBrand.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setRecentActivity(data || []);
    } catch (error: any) {
      console.error('Failed to fetch activity:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getActionIcon = (action: string) => {
    if (action.includes('upload')) return <Upload className="h-4 w-4 text-success" />;
    if (action.includes('delete')) return <Trash2 className="h-4 w-4 text-destructive" />;
    return <BarChart3 className="h-4 w-4 text-primary" />;
  };

  const getActionText = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
    </div>;
  }

  return (
    <div className="space-y-8">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">By User</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total Assets</h3>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-4xl font-display font-bold">{overallStats.totalAssets}</p>
            </Card>

            <Card className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total Uploads</h3>
                <Upload className="h-5 w-5 text-success" />
              </div>
              <p className="text-4xl font-display font-bold">{overallStats.totalUploads}</p>
            </Card>

            <Card className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total Deletions</h3>
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-4xl font-display font-bold">{overallStats.totalDeletions}</p>
            </Card>

            <Card className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total Storage</h3>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <p className="text-4xl font-display font-bold">{formatFileSize(overallStats.totalStorage)}</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6 mt-6">
          <Card className="p-8">
            <h3 className="text-2xl font-display font-semibold mb-6">User Statistics</h3>
            <div className="space-y-4">
              {userStats.map((stat) => (
                <div key={stat.user_id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{stat.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.uploads} uploads • {stat.deletions} deletions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-semibold">{formatFileSize(stat.total_size)}</p>
                    <p className="text-xs text-muted-foreground">Total storage</p>
                  </div>
                </div>
              ))}
              {userStats.length === 0 && (
                <p className="text-center text-muted-foreground py-12">No user data available</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6 mt-6">
          <Card className="p-8">
            <h3 className="text-2xl font-display font-semibold mb-6">Recent Activity</h3>
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {activity.profiles?.full_name || 'Unknown'} {getActionText(activity.action).toLowerCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  {activity.metadata?.file_name && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {activity.metadata.file_name}
                    </p>
                  )}
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-center text-muted-foreground py-12">No recent activity</p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}