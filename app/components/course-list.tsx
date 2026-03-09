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
    categoryTypes: string[];
    trackNames: string[];
    languages: string[];
  };
};

function trackToken(trackName: string | null) {
  switch (trackName) {
    case 'Economics and Management':
      return 'track-econ';
    case 'General Elective':
      return 'track-general';
    case 'History and Archaeology':
      return 'track-history';
    case 'Law and Society':
      return 'track-law';
    case 'Literature and Culture':
      return 'track-literature';
    case 'Philosophy and Religion':
      return 'track-philosophy';
    case 'Politics and International Relations':
      return 'track-politics';
    default:
      return 'track-default';
  }
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
            if (activeQuery.categoryTypes.length > 0) params.set('category_type', activeQuery.categoryTypes.join(','));
            if (activeQuery.trackNames.length > 0) params.set('track_name', activeQuery.trackNames.join(','));
            if (activeQuery.languages.length > 0) params.set('language', activeQuery.languages.join(','));
            params.set('selected_course_id', course.course_id);

            const isActive = selectedCourseId === course.course_id;
            const reviewCount = course.review_count ?? 0;

            return (
              <li key={course.course_id} className={`course-item ${isActive ? 'selected' : ''}`}>
                <Link href={`/?${params.toString()}`} scroll={false} className="course-link">
                  <h3 className="course-name">{course.course_name}</h3>
                  <div className="course-meta-row">
                    <div className="meta course-meta">
                      {course.category_type && (
                        <span className={`tag category ${course.category_type === 'Yenching' ? 'is-yenching' : 'is-pku'}`}>
                          {course.category_type}
                        </span>
                      )}
                      {course.track_name && <span className={`tag ${trackToken(course.track_name)}`}>{course.track_name}</span>}
                      {course.language && <span className="tag language">{course.language}</span>}
                    </div>
                    <span className="review-count-text">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
                  </div>
                  <p className="review-count">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
