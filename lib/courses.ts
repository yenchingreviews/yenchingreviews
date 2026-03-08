import { getSupabaseSetupMessage } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Course } from '@/types/course';
import type { Review } from '@/types/review';

type CourseFilters = {
  search?: string;
  categoryType?: string;
  trackName?: string;
  language?: string;
};

export async function getCourses(filters: CourseFilters) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      courses: [] as Course[],
      error: getSupabaseSetupMessage(),
    };
  }

  let query = supabase
    .from('courses')
    .select('*')
    .order('course_name', { ascending: true });

  if (filters.search?.trim()) {
    query = query.ilike('course_name', `%${filters.search.trim()}%`);
  }

  if (filters.categoryType?.trim()) {
    query = query.eq('category_type', filters.categoryType.trim());
  }

  if (filters.trackName?.trim()) {
    query = query.eq('track_name', filters.trackName.trim());
  }

  if (filters.language?.trim()) {
    query = query.eq('language', filters.language.trim());
  }

  const { data, error } = await query;

  if (error) {
    return {
      courses: [] as Course[],
      error: `Could not load courses: ${error.message}`,
    };
  }

  return {
    courses: (data ?? []) as Course[],
    error: null,
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

  const { data } = await supabase
    .from('courses')
    .select('category_type, track_name, language')
    .limit(5000);

  const categories = new Set<string>();
  const tracks = new Set<string>();
  const languages = new Set<string>();

  (data ?? []).forEach((row) => {
    if (row.category_type) categories.add(row.category_type);
    if (row.track_name) tracks.add(row.track_name);
    if (row.language) languages.add(row.language);
  });

  return {
    categories: Array.from(categories).sort(),
    tracks: Array.from(tracks).sort(),
    languages: Array.from(languages).sort(),
  };
}

export async function getCourseById(courseId: string) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      course: null as Course | null,
      error: getSupabaseSetupMessage(),
    };
  }

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) {
    return {
      course: null as Course | null,
      error: `Could not load course: ${error.message}`,
    };
  }

  return {
    course: (data as Course | null) ?? null,
    error: null,
  };
}

export async function getCourseReviews(courseId: string) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      reviews: [] as Review[],
      error: getSupabaseSetupMessage(),
    };
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('course_id', courseId);

  if (error) {
    return {
      reviews: [] as Review[],
      error: `Could not load reviews: ${error.message}`,
    };
  }

  return {
    reviews: (data ?? []) as Review[],
    error: null,
  };
}
