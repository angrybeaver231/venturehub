import { CourseCard } from "../course-card";

export default function CourseCardExample() {
  const sampleCourse = {
    id: "1",
    title: "Introduction to Financial Markets",
    description: "Learn the fundamentals of financial markets, investment strategies, and portfolio management",
    modules: 8,
    duration: "6 weeks",
    progress: 35,
    status: "in-progress" as const,
  };

  return (
    <div className="p-8 max-w-sm">
      <CourseCard 
        course={sampleCourse} 
        onStart={(id) => console.log("Starting course:", id)} 
      />
    </div>
  );
}
