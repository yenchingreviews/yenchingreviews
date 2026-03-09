import { getSupabaseSetupMessage } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Course, Review } from '@/types/course';

type CourseFilters = {
  search?: string;
  categoryType?: string;
  trackName?: string;
  language?: string;
};

const COURSE_SELECT_COLUMNS =
  'course_id, course_name, category_type, track_name, language, latest_name_source_term, name_variants, source_terms_present, notes';

const REVIEW_SELECT_COLUMNS =
  'review_id, course_id, course_name, category_type, track_name, term_label, term_year, term_season, professor_name, review_order_in_term_left_to_right, review_text, reviewer_display_name, is_anonymous, legacy_review, rating_quality, rating_workload, used_for_track_credit, used_for_track, source_sheet, source_row, source_review_column_index';

const TERM_SEASON_RANK: Record<string, number> = {
  spring: 4,
  summer: 3,
  fall: 2,
  winter: 1,
};

function normalizeSeason(season: string | null | undefined) {
  return season?.trim().toLowerCase() ?? '';
}

function seasonRank(season: string | null) {
  return TERM_SEASON_RANK[normalizeSeason(season)] ?? 0;
}

function sortReviewsByChronology(reviews: Review[]) {
  return [...reviews].sort((a, b) => {
    const yearDiff = (b.term_year ?? -1) - (a.term_year ?? -1);
    if (yearDiff !== 0) return yearDiff;

    const seasonDiff = seasonRank(b.term_season) - seasonRank(a.term_season);
    if (seasonDiff !== 0) return seasonDiff;

    const orderDiff =
      (a.review_order_in_term_left_to_right ?? Number.MAX_SAFE_INTEGER) -
      (b.review_order_in_term_left_to_right ?? Number.MAX_SAFE_INTEGER);
    if (orderDiff !== 0) return orderDiff;

    return a.review_id.localeCompare(b.review_id);
  });
}

function escapeLikeTerm(value: string) {
  return value.replace(/[%_,]/g, (char) => `\\${char}`);
}

export async function getCourses(filters: CourseFilters) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      courses: [] as Course[],
      error: getSupabaseSetupMessage(),
    };
  }

  let query = supabase.from('courses').select(COURSE_SELECT_COLUMNS).order('course_name', { ascending: true });

  if (filters.search?.trim()) {
    const searchTerm = escapeLikeTerm(filters.search.trim());
    query = query.or(
      [
        `course_name.ilike.%${searchTerm}%`,
        `name_variants.ilike.%${searchTerm}%`,
        `track_name.ilike.%${searchTerm}%`,
        `category_type.ilike.%${searchTerm}%`,
      ].join(','),
    );
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

export async function getReviewsForCourse(courseId: string) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      reviews: [] as Review[],
      error: getSupabaseSetupMessage(),
    };
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT_COLUMNS)
    .eq('course_id', courseId);

  if (error) {
    return {
      reviews: [] as Review[],
      error: `Could not load reviews: ${error.message}`,
    };
  }

  return {
    reviews: sortReviewsByChronology((data ?? []) as Review[]),
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

  const { data } = await supabase.from('courses').select('category_type, track_name, language').limit(5000);

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
