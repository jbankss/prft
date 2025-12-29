import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, TrendingUp, Upload, Trash2, User, HardDrive, FolderOpen, Image } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface UserStats {
  user_id: string;
  full_name: string;
  uploads: number;
  deletions: number;
  total_size: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function AnalyticsView() {
  const { currentBrand } = useBrandContext();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalAssets: 0,
    totalUploads: 0,
    totalDeletions: 0,
    totalStorage: 0,
    totalCollections: 0
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

      // Get collections count
      const { count: collectionsCount } = await supabase
        .from('asset_collections')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', currentBrand.id);

      if (assets) {
        // Calculate user stats
        const userStatsMap: { [key: string]: UserStats } = {};
        const categoryMap: { [key: string]: number } = {};
        
        assets.forEach(asset => {
          // Category data
          categoryMap[asset.category] = (categoryMap[asset.category] || 0) + 1;
          
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

        // Convert category map to array for chart
        setCategoryData(
          Object.entries(categoryMap).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value
          }))
        );

        // Count deletions from logs
        if (logs) {
          logs.forEach(log => {
            if (log.action === 'deleted_asset' && userStatsMap[log.user_id]) {
              userStatsMap[log.user_id].deletions++;
            }
          });
        }

        setUserStats(Object.values(userStatsMap).sort((a, b) => b.uploads - a.uploads));

        // Calculate overall stats
        setOverallStats({
          totalAssets: assets.length,
          totalUploads: logs?.filter(l => l.action === 'uploaded_asset').length || 0,
          totalDeletions: logs?.filter(l => l.action === 'deleted_asset').length || 0,
          totalStorage: assets.reduce((sum, a) => sum + a.file_size, 0),
          totalCollections: collectionsCount || 0
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
        .limit(15);

      setRecentActivity(data || []);
    } catch (error: any) {
      console.error('Failed to fetch activity:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getActionIcon = (action: string) => {
    if (action.includes('upload')) return <Upload className="h-4 w-4 text-emerald-500" />;
    if (action.includes('delete')) return <Trash2 className="h-4 w-4 text-red-500" />;
    return <BarChart3 className="h-4 w-4 text-primary" />;
  };

  const getActionText = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-muted animate-pulse rounded-2xl" />
          <div className="h-80 bg-muted animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assets</h3>
            <Image className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold font-display">{overallStats.totalAssets}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Uploads</h3>
            <Upload className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold font-display">{overallStats.totalUploads}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deletions</h3>
            <Trash2 className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-3xl font-bold font-display">{overallStats.totalDeletions}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Collections</h3>
            <FolderOpen className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold font-display">{overallStats.totalCollections}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Storage</h3>
            <HardDrive className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-bold font-display">{formatFileSize(overallStats.totalStorage)}</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Assets by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No category data available
            </div>
          )}
        </Card>

        {/* Top Contributors */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Top Contributors</h3>
          {userStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={userStats.slice(0, 5)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="full_name" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} uploads`, 'Uploads']}
                />
                <Bar dataKey="uploads" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No contributor data available
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Leaderboard */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">User Statistics</h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {userStats.map((stat, index) => (
                <div key={stat.user_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{stat.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.uploads} uploads • {stat.deletions} deletions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold">{formatFileSize(stat.total_size)}</p>
                  </div>
                </div>
              ))}
              {userStats.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No user data available</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Activity Stream */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.profiles?.full_name || 'Unknown'} {getActionText(activity.action).toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  {activity.metadata?.file_name && (
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {activity.metadata.file_name}
                    </p>
                  )}
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
