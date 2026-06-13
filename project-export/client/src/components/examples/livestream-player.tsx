import { LivestreamPlayer } from "../livestream-player";

export default function LivestreamPlayerExample() {
  const sampleLivestream = {
    id: "1",
    title: "Q4 Business Strategy Summit 2024",
    rutubeUrl: "https://rutube.ru/example-stream",
    isLive: true,
  };

  return (
    <div className="p-8 max-w-4xl">
      <LivestreamPlayer livestream={sampleLivestream} />
    </div>
  );
}
