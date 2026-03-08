import { CourseFilters } from '@/app/components/course-filters';
import { CourseList } from '@/app/components/course-list';
import { getCourseFilterOptions, getCourses } from '@/lib/courses';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams: {
    search?: string;
    category_type?: string;
    track_name?: string;
    language?: string;
  };
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const selected = {
    search: searchParams.search ?? '',
    categoryType: searchParams.category_type ?? '',
    trackName: searchParams.track_name ?? '',
    language: searchParams.language ?? '',
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

  return (
    <main className="page">
      <h1 className="brand">yenchingreviews</h1>
      <p className="subtitle">browse yenching academy and pku-wide courses</p>

      {results.error && <p className="notice">{results.error}</p>}

      <CourseFilters selected={selected} options={filters} />
      <CourseList courses={results.courses} />
    </main>
  );
}
