import { WatchlistsPanel } from "@/components/watchlists-panel";

export default function WatchlistsPage() {
  return (
    <div className="space-y-6" data-testid="page-watchlists">
      <WatchlistsPanel embedded={false} />
    </div>
  );
}
