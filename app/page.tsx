import { CourseDetail } from '@/app/components/course-detail';
import { CourseFilters } from '@/app/components/course-filters';
import { CourseList } from '@/app/components/course-list';
import { Header } from '@/app/components/header';
import { getCourseFilterOptions, getCourses, getReviewsForCourse } from '@/lib/courses';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams: {
    search?: string;
    category_type?: string;
    track_name?: string;
    language?: string;
    selected_course_id?: string;
  };
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const selected = {
    search: searchParams.search ?? '',
    categoryType: searchParams.category_type ?? '',
    trackName: searchParams.track_name ?? '',
    language: searchParams.language ?? '',
    selectedCourseId: searchParams.selected_course_id ?? '',
  };

  const [filters, results] = await Promise.all([
    getCourseFilterOptions(),
    getCourses({
      search: selected.search,
      categoryType: selected.categoryType,
      trackName: selected.trackName,
      language: selected.language,
    }),
  ]);

  const selectedCourse = results.courses.find((course) => course.course_id === selected.selectedCourseId) ?? null;

  const reviewResults = selectedCourse
    ? await getReviewsForCourse(selectedCourse.course_id)
    : {
        reviews: [],
        error: null,
      };

  return (
    <>
      <Header />
      <main className="catalog-page">
        {(results.error || reviewResults.error) && <p className="notice">{results.error ?? reviewResults.error}</p>}

        <div className="catalog-grid">
          <div className="left-column">
            <CourseFilters selected={{ categoryType: selected.categoryType, trackName: selected.trackName, language: selected.language }} options={filters} />
          </div>
          <div className="middle-column">
            <CourseList
              courses={results.courses}
              selectedCourseId={selectedCourse?.course_id}
              activeQuery={selected}
            />
          </div>
          <div className="right-column">
            <CourseDetail course={selectedCourse} reviews={reviewResults.reviews} />
          </div>
        </div>
      </main>
    </>
  );
}
