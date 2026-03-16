'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CourseDetail } from '@/app/components/course-detail';
import { CourseFilters } from '@/app/components/course-filters';
import { CourseList } from '@/app/components/course-list';
import type { Course, Review } from '@/types/course';

type MobileCatalogShellProps = {
  selected: {
    search: string;
    categoryTypes: string[];
    trackNames: string[];
    languages: string[];
  };
  filters: {
    categories: string[];
    tracks: string[];
    languages: string[];
  };
  courses: Course[];
  selectedCourse: Course | null;
  reviews: Review[];
  writeReviewHref: string | null;
  isWriteReviewActive?: boolean;
};

export function MobileCatalogShell({
  selected,
  filters,
  courses,
  selectedCourse,
  reviews,
  writeReviewHref,
  isWriteReviewActive = false,
}: MobileCatalogShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousCatalogScrollRef = useRef(0);

  useEffect(() => {
    if (!selectedCourse) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'auto' });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedCourse]);

  function handleCourseSelect() {
    previousCatalogScrollRef.current = window.scrollY;
  }

  function handleBackToCatalog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('selected_course_id');

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    window.requestAnimationFrame(() => {
      window.scrollTo(0, previousCatalogScrollRef.current);
    });
  }

  return (
    <div className={`mobile-catalog-shell ${selectedCourse ? 'detail-active' : ''}`}>
      <div className="mobile-screen-track">
        <section className="mobile-screen mobile-catalog-screen" aria-hidden={Boolean(selectedCourse)}>
          <CourseFilters
            selected={{
              categoryTypes: selected.categoryTypes,
              trackNames: selected.trackNames,
              languages: selected.languages,
            }}
            options={filters}
          />
          <CourseList
            courses={courses}
            selectedCourseId={selectedCourse?.course_id}
            activeQuery={selected}
            onCourseSelect={handleCourseSelect}
          />
        </section>

        <section className="mobile-screen mobile-detail-screen" aria-hidden={!selectedCourse}>
          <CourseDetail
            course={selectedCourse}
            reviews={reviews}
            writeReviewHref={writeReviewHref}
            isWriteReviewActive={isWriteReviewActive}
            onBack={handleBackToCatalog}
            showMobileBack
          />
        </section>
      </div>
    </div>
  );
}
