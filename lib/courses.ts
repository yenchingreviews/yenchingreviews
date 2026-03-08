import { getSupabaseSetupMessage } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Course } from '@/types/course';

type CourseFilters = {
  search?: string;
  categoryType?: string;
  trackName?: string;
  language?: string;
};

type RawCourseRow = Record<string, unknown>;

function normalizeCourse(row: RawCourseRow): Course | null {
  const courseName = row.course_name ?? row.name;
  const courseId = row.course_id ?? row.id ?? courseName;

  if (typeof courseName !== 'string' || courseName.trim().length === 0) {
    return null;
  }

  return {
    course_id: String(courseId ?? courseName),
    course_name: courseName,
    category_type:
      typeof row.category_type === 'string'
        ? row.category_type
        : typeof row.category === 'string'
          ? row.category
          : null,
    track_name:
      typeof row.track_name === 'string'
        ? row.track_name
        : typeof row.track === 'string'
          ? row.track
          : null,
    language: typeof row.language === 'string' ? row.language : null,
    aliases: typeof row.aliases === 'string' ? row.aliases : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
  };
}

function matchesFilters(course: Course, filters: CourseFilters) {
  const search = filters.search?.trim().toLowerCase();
  const categoryType = filters.categoryType?.trim();
  const trackName = filters.trackName?.trim();
  const language = filters.language?.trim();

  if (search) {
    const name = course.course_name.toLowerCase();
    const aliases = course.aliases?.toLowerCase() ?? '';

    if (!name.includes(search) && !aliases.includes(search)) {
      return false;
    }
  }

  if (categoryType && course.category_type !== categoryType) {
    return false;
  }

  if (trackName && course.track_name !== trackName) {
    return false;
  }

  if (language && course.language !== language) {
    return false;
  }

  return true;
}

export async function getCourses(filters: CourseFilters) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      courses: [] as Course[],
      error: getSupabaseSetupMessage(),
      emptyReason: null as string | null,
    };
  }

  const { data, error } = await supabase.from('courses').select('*');

  if (error) {
    return {
      courses: [] as Course[],
      error: `Could not load courses: ${error.message}`,
      emptyReason: null as string | null,
    };
  }

  const normalizedCourses = (data ?? [])
    .map((row) => normalizeCourse(row as RawCourseRow))
    .filter((course): course is Course => Boolean(course))
    .sort((a, b) => a.course_name.localeCompare(b.course_name));

  const filteredCourses = normalizedCourses.filter((course) => matchesFilters(course, filters));

  if (filteredCourses.length === 0) {
    const hasActiveFilters = Boolean(
      filters.search?.trim() ||
        filters.categoryType?.trim() ||
        filters.trackName?.trim() ||
        filters.language?.trim(),
    );

    return {
      courses: [] as Course[],
      error: null,
      emptyReason: hasActiveFilters
        ? 'No courses matched the active filters.'
        : 'Received zero rows from Supabase. If courses exist, check RLS SELECT policies for anon access on the courses table.',
    };
  }

  return {
    courses: filteredCourses,
    error: null,
    emptyReason: null as string | null,
  };
}

export async function getCourseFilterOptions() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      categories: [] as string[],
      tracks: [] as string[],
      languages: [] as string[],
    };
  }

  const { data } = await supabase.from('courses').select('*').limit(5000);

  const categories = new Set<string>();
  const tracks = new Set<string>();
  const languages = new Set<string>();

  (data ?? []).forEach((rawRow) => {
    const row = rawRow as RawCourseRow;
    const category = row.category_type ?? row.category;
    const track = row.track_name ?? row.track;

    if (typeof category === 'string') categories.add(category);
    if (typeof track === 'string') tracks.add(track);
    if (typeof row.language === 'string') languages.add(row.language);
  });

  return {
    categories: Array.from(categories).sort(),
    tracks: Array.from(tracks).sort(),
    languages: Array.from(languages).sort(),
  };
}
