import { EventCard } from "../event-card";

export default function EventCardExample() {
  const sampleEvent = {
    id: "1",
    name: "Networking Night 2024",
    date: "October 15, 2024",
    time: "18:00",
    location: "Main Hall, Building A",
    duration: "2 hours",
    status: "upcoming" as const,
    attendees: 45,
  };

  return (
    <div className="p-8 max-w-sm">
      <EventCard 
        event={sampleEvent} 
        onRegister={(id) => console.log("Registering for event:", id)} 
      />
    </div>
  );
}
