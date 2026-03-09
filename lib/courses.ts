import { getSupabaseSetupMessage } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Course, Review } from '@/types/course';

type CourseFilters = {
  search?: string;
  categoryTypes?: string[];
  trackNames?: string[];
  languages?: string[];
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

const TRACK_ORDER: Record<string, number> = {
  'Economics and Management': 0,
  'History and Archaeology': 1,
  'Law and Society': 2,
  'Literature and Culture': 3,
  'Philosophy and Religion': 4,
  'Politics and International Relations': 5,
  'General Elective': 999,
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
      (b.review_order_in_term_left_to_right ?? Number.MIN_SAFE_INTEGER) -
      (a.review_order_in_term_left_to_right ?? Number.MIN_SAFE_INTEGER);
    if (orderDiff !== 0) return orderDiff;

    return a.review_id.localeCompare(b.review_id);
  });
}

function normalizeTrackName(trackName: string | null | undefined) {
  if (!trackName) return '';

  const cleaned = trackName.trim().replace(/\s+/g, ' ');
  const normalized = cleaned.toLowerCase();

  if (normalized === 'international law') {
    return 'International Law';
  }

  return cleaned;
}

function normalizeLanguage(language: string | null | undefined) {
  if (!language) return '';
  const cleaned = language.trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.includes('/')) return '';
  return cleaned;
}

function categorySort(a: string, b: string) {
  const priority: Record<string, number> = {
    Yenching: 0,
    'PKU Wide': 1,
  };

  const rankA = priority[a] ?? 99;
  const rankB = priority[b] ?? 99;
  if (rankA !== rankB) return rankA - rankB;
  return a.localeCompare(b);
}

function trackSort(a: string, b: string) {
  const rankA = TRACK_ORDER[a] ?? 100;
  const rankB = TRACK_ORDER[b] ?? 100;
  if (rankA !== rankB) return rankA - rankB;
  return a.localeCompare(b);
}

function escapeLikeTerm(value: string) {
  return value.replace(/[%_,]/g, (char) => `\\${char}`);
}

function dedupeCoursesById(courses: Course[]) {
  const deduped = new Map<string, Course>();

  courses.forEach((course) => {
    const current = deduped.get(course.course_id);
    if (!current) {
      deduped.set(course.course_id, course);
      return;
    }

    const currentTerm = current.latest_name_source_term ?? '';
    const nextTerm = course.latest_name_source_term ?? '';

    if (nextTerm.localeCompare(currentTerm) >= 0) {
      deduped.set(course.course_id, course);
    }
  });

  return Array.from(deduped.values()).sort((a, b) => a.course_name.localeCompare(b.course_name));
}


export async function getCourses(filters: CourseFilters): Promise<{ courses: Course[]; error: string | null }> {
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

  if ((filters.categoryTypes ?? []).length > 0) {
    query = query.in('category_type', filters.categoryTypes ?? []);
  }

  if ((filters.languages ?? []).length > 0) {
    query = query.in('language', filters.languages ?? []);
  }

  const { data, error } = await query;

  if (error) {
    return {
      courses: [] as Course[],
      error: `Could not load courses: ${error.message}`,
    };
  }

  let courses = dedupeCoursesById(
    ((data ?? []) as Course[]).map((course) => ({
      ...course,
      track_name: normalizeTrackName(course.track_name),
      language: normalizeLanguage(course.language),
    })),
  );

  if ((filters.trackNames ?? []).length > 0) {
    const selectedTracks = new Set((filters.trackNames ?? []).map((track) => normalizeTrackName(track)));
    courses = courses.filter((course) => selectedTracks.has(normalizeTrackName(course.track_name)));
  }

  const courseIds = courses.map((course) => course.course_id);
  const reviewCounts = new Map<string, number>();

  if (courseIds.length > 0) {
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('course_id')
      .in('course_id', courseIds);

    (reviewRows ?? []).forEach((row) => {
      const id = row.course_id as string | null;
      if (!id) return;
      reviewCounts.set(id, (reviewCounts.get(id) ?? 0) + 1);
    });
  }

  return {
    courses: courses.map((course) => ({
      ...course,
      review_count: reviewCounts.get(course.course_id) ?? 0,
    })),
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

  const categories = new Set<string>();
  const tracks = new Set<string>();
  const languages = new Set<string>();

  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('courses')
      .select('course_id, course_name, category_type, track_name, language, latest_name_source_term')
      .range(offset, offset + pageSize - 1);

    if (error || !data || data.length === 0) {
      break;
    }

    dedupeCoursesById((data ?? []) as Course[]).forEach((row) => {
      if (row.category_type) categories.add(row.category_type);
      if (row.track_name) tracks.add(normalizeTrackName(row.track_name));

      const language = normalizeLanguage(row.language);
      if (language) languages.add(language);
    });

    if (data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return {
    categories: Array.from(categories).sort(categorySort),
    tracks: Array.from(tracks).sort(trackSort),
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

  const course = (data as Course | null) ?? null;

  return {
    course: course
      ? {
          ...course,
          track_name: normalizeTrackName(course.track_name),
          language: normalizeLanguage(course.language),
        }
      : null,
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
    reviews: sortReviewsByChronology((data ?? []) as Review[]),
    error: null,
  };
}
