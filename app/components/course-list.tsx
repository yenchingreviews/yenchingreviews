'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { formatCategoryLabel, isYenchingCategory } from '@/app/components/category-label';
import { trackToken } from '@/app/components/track-token';
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

export function CourseList({ courses, selectedCourseId, activeQuery, onCourseSelect }: CourseListProps & { onCourseSelect?: () => void }) {
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
        <div className="catalog-search-wrap">
          <span className="catalog-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" focusable="false">
              <path
                d="M10.5 3.75a6.75 6.75 0 1 0 4.243 11.996l4.255 4.254a.75.75 0 1 0 1.06-1.06l-4.254-4.255A6.75 6.75 0 0 0 10.5 3.75Zm0 1.5a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input
            placeholder="Search course names by keyword..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            className="catalog-search"
          />
        </div>
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
                <Link
                  href={`/?${params.toString()}`}
                  scroll={false}
                  className="course-link"
                  onClick={onCourseSelect}
                >
                  <h3 className="course-name">{course.course_name}</h3>
                  <div className="course-meta-row">
                    <div className="meta course-meta">
                      {course.category_type && (
                        <span className={`tag category ${isYenchingCategory(course.category_type) ? 'is-yenching' : 'is-pku'}`}>
                          {formatCategoryLabel(course.category_type)}
                        </span>
                      )}
                      {course.track_name && <span className={`tag ${trackToken(course.track_name)}`}>{course.track_name}</span>}
                      {course.language && <span className="tag language">{course.language}</span>}
                    </div>
                    <span className="review-count-text">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
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
