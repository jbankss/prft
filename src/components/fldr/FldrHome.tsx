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
    <div className="animate-fade-in space-y-8">
      {/* Greeting + Clock + AI Insights */}
      <FldrGreeting />

      {/* Folder Grid - Collections only, no quick access */}
      <FolderGrid 
        onNavigateToAssets={onNavigateToAssets} 
        showQuickAccess={false}
      />

      {/* Bottom Grid: Activity Feed + Quick Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeedCard />
        <QuickUploadCard onNavigateToUpload={onNavigateToUpload} />
      </div>
    </div>
  );
}
