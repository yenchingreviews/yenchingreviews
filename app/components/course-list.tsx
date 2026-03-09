'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import type { Course } from '@/types/course';

type CourseListProps = {
  courses: Course[];
  selectedCourseId?: string;
  activeQuery: {
    search: string;
    categoryType: string;
    trackName: string;
    language: string;
  };
};

function trackToken(trackName: string | null) {
  if (!trackName) return 'track-default';

  const palette = ['track-amber', 'track-blue', 'track-rose', 'track-violet', 'track-teal', 'track-olive', 'track-orange'];

  const hash = Array.from(trackName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function CourseList({ courses, selectedCourseId, activeQuery }: CourseListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(activeQuery.search);

  useEffect(() => {
    setSearchValue(activeQuery.search);
  }, [activeQuery.search]);

  function pushParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      pushParam('search', searchValue.trim());
    }, 180);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <section className="course-catalog">
      <div className="catalog-head">
        <input
          placeholder="Search courses by keyword"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          className="catalog-search"
        />
        <p>{isPending ? 'Updating…' : `${courses.length} courses`}</p>
      </div>

      {courses.length === 0 ? (
        <p>No courses match the current filters.</p>
      ) : (
        <ul className="course-list">
          {courses.map((course) => {
            const params = new URLSearchParams();
            if (activeQuery.search) params.set('search', activeQuery.search);
            if (activeQuery.categoryType) params.set('category_type', activeQuery.categoryType);
            if (activeQuery.trackName) params.set('track_name', activeQuery.trackName);
            if (activeQuery.language) params.set('language', activeQuery.language);
            params.set('selected_course_id', course.course_id);

            const isActive = selectedCourseId === course.course_id;

            return (
              <li key={course.course_id} className={`course-item ${isActive ? 'selected' : ''}`}>
                <Link href={`/?${params.toString()}`} scroll={false} className="course-link">
                  <h3 className="course-name">{course.course_name}</h3>
                  <div className="meta">
                    {course.category_type && (
                      <span className={`tag category ${course.category_type === 'Yenching' ? 'is-yenching' : 'is-pku'}`}>
                        {course.category_type}
                      </span>
                    )}
                    {course.track_name && <span className={`tag ${trackToken(course.track_name)}`}>{course.track_name}</span>}
                    {course.language && <span className="tag language">{course.language}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
