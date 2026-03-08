import type { Course } from '@/types/course';

type CourseListProps = {
  courses: Course[];
  emptyMessage?: string | null;
};

export function CourseList({ courses, emptyMessage }: CourseListProps) {
  if (courses.length === 0) {
    return <p className="panel">{emptyMessage ?? 'No courses match the current filters.'}</p>;
  }

  return (
    <ul className="course-list">
      {courses.map((course) => (
        <li key={course.course_id} className="course-item">
          <h2 className="course-name">{course.course_name}</h2>
          <div className="meta">
            {course.category_type && <span className="tag">{course.category_type}</span>}
            {course.track_name && <span className="tag">{course.track_name}</span>}
            {course.language && <span className="tag">{course.language}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
