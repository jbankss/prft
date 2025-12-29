import { FldrGreeting } from './FldrGreeting';
import { FolderGrid } from './FolderGrid';
import { ActivityFeedCard } from './ActivityFeedCard';
import { QuickUploadCard } from './QuickUploadCard';

interface FldrHomeProps {
  onNavigateToAssets: () => void;
  onNavigateToUpload: () => void;
}

export function FldrHome({ onNavigateToAssets, onNavigateToUpload }: FldrHomeProps) {
  return (
    <div className="animate-fade-in">
      {/* Greeting + Clock + AI Insights */}
      <FldrGreeting />

      {/* Folder Grid */}
      <div className="mt-8">
        <FolderGrid onNavigateToAssets={onNavigateToAssets} />
      </div>

      {/* Bottom Grid: Activity Feed + Quick Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <ActivityFeedCard />
        <QuickUploadCard onNavigateToUpload={onNavigateToUpload} />
      </div>
    </div>
  );
}
