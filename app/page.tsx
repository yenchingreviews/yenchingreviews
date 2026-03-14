import { CourseDetail } from '@/app/components/course-detail';
import { CourseFilters } from '@/app/components/course-filters';
import { CourseList } from '@/app/components/course-list';
import { Header } from '@/app/components/header';
import { ReviewSubmissionModal } from '@/app/components/review-submission-modal';
import { getCourseFilterOptions, getCourses, getReviewsForCourse } from '@/lib/courses';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams: {
    search?: string;
    category_type?: string;
    track_name?: string;
    language?: string;
    selected_course_id?: string;
    review_mode?: string;
  };
};

function parseMultiValue(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const selected = {
    search: searchParams.search ?? '',
    categoryTypes: parseMultiValue(searchParams.category_type),
    trackNames: parseMultiValue(searchParams.track_name),
    languages: parseMultiValue(searchParams.language),
    selectedCourseId: searchParams.selected_course_id ?? '',
  };

  const [filters, results, allCourseResults] = await Promise.all([
    getCourseFilterOptions(),
    getCourses({
      search: selected.search,
      categoryTypes: selected.categoryTypes,
      trackNames: selected.trackNames,
      languages: selected.languages,
    }),
    getCourses({
      search: '',
      categoryTypes: [],
      trackNames: [],
      languages: [],
    }),
  ]);

  const selectedCourse = results.courses.find((course) => course.course_id === selected.selectedCourseId) ?? null;
  const reviewMode = searchParams.review_mode === 'global' || searchParams.review_mode === 'selected' ? searchParams.review_mode : null;

  const reviewResults = selectedCourse
    ? await getReviewsForCourse(selectedCourse.course_id)
    : {
        reviews: [],
        error: null,
      };

  const globalParams = new URLSearchParams();
  globalParams.set('review_mode', 'global');

  const selectedParams = new URLSearchParams(globalParams.toString());
  selectedParams.set('review_mode', 'selected');

  return (
    <>
      <Header addReviewHref={`/?${globalParams.toString()}`} />
      <main className="catalog-page">
        {(results.error || reviewResults.error) && <p className="notice">{results.error ?? reviewResults.error}</p>}

        <div className="catalog-grid">
          <div className="left-column">
            <CourseFilters selected={{ categoryTypes: selected.categoryTypes, trackNames: selected.trackNames, languages: selected.languages }} options={filters} />
          </div>
          <div className="middle-column">
            <CourseList
              courses={results.courses}
              selectedCourseId={selectedCourse?.course_id}
              activeQuery={selected}
            />
          </div>
          <div className="right-column">
            <CourseDetail course={selectedCourse} reviews={reviewResults.reviews} writeReviewHref={selectedCourse ? `/?${selectedParams.toString()}` : null} />
          </div>
        </div>

        <ReviewSubmissionModal
          mode={reviewMode}
          courses={reviewMode === 'global' ? allCourseResults.courses : results.courses}
          selectedCourse={selectedCourse}
          trackOptions={filters.tracks}
        />
      </main>
    </>
  );
}
