import { VideoCard } from "../video-card";

export default function VideoCardExample() {
  const sampleVideo = {
    id: "1",
    title: "Financial Markets Workshop - Understanding Investment Strategies",
    date: "September 28, 2024",
    comments: 12,
  };

  return (
    <div className="p-8 max-w-sm">
      <VideoCard 
        video={sampleVideo} 
        onClick={(id) => console.log("Playing video:", id)} 
      />
    </div>
  );
}
