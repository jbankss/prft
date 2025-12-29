import { FldrGreeting } from './FldrGreeting';
import { FolderGrid } from './FolderGrid';
import { AIInsightsCard } from './AIInsightsCard';
import { ActivityFeedCard } from './ActivityFeedCard';
import { QuickUploadCard } from './QuickUploadCard';

interface FldrHomeProps {
  onNavigateToAssets: () => void;
  onNavigateToUpload: () => void;
}

export function FldrHome({ onNavigateToAssets, onNavigateToUpload }: FldrHomeProps) {
  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Greeting + Clock */}
      <FldrGreeting />

      {/* Folder Grid */}
      <FolderGrid onNavigateToAssets={onNavigateToAssets} />

      {/* Bottom Grid: AI Insights + Activity Feed + Quick Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AIInsightsCard />
        <ActivityFeedCard />
        <QuickUploadCard onNavigateToUpload={onNavigateToUpload} />
      </div>
    </div>
  );
}
