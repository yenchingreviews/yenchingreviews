import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Course } from '@/types/course';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

type SubmitReviewPayload = {
  mode: 'existing' | 'new';
  courseId?: string;
  courseName?: string;
  categoryType?: 'Yenching' | 'PKU-Wide' | string;
  trackName?: string;
  language?: string;
  usedForTrackCredit?: boolean;
  usedForTrack?: string;
  professorName?: string;
  termSeason?: 'Fall' | 'Spring' | string;
  termYear?: number;
  ratingQuality?: number;
  ratingWorkload?: 'Light' | 'Moderate' | 'Heavy' | string;
  reviewText?: string;
};

type CourseRow = Pick<Course, 'course_id' | 'course_name' | 'category_type' | 'track_name'>;

const allowedWorkloads = new Set(['Light', 'Moderate', 'Heavy']);
const allowedSeasons = new Set(['Fall', 'Spring']);
const allowedCategories = new Set(['Yenching', 'PKU-Wide']);
const RATE_LIMIT_WINDOW_MS = 15_000;
const RATE_LIMIT_COUNT = 5;
const requestCounts = new Map<string, number[]>();

function trimText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCategory(value: string) {
  if (value === 'PKU-Wide' || value === 'PKU Wide') return 'PKU Wide';
  return value;
}

function sanitizePayload(raw: SubmitReviewPayload) {
  const mode = raw.mode;
  if (mode !== 'existing' && mode !== 'new') {
    return { error: 'Invalid submission mode.' };
  }

  const professorName = trimText(raw.professorName);
  const reviewText = trimText(raw.reviewText);
  const termSeason = trimText(raw.termSeason);
  const ratingWorkload = trimText(raw.ratingWorkload);
  const termYear = Number(raw.termYear);
  const ratingQuality = Number(raw.ratingQuality);

  if (!professorName) return { error: 'Professor name is required.' };
  if (!reviewText) return { error: 'Review text is required.' };
  if (!allowedSeasons.has(termSeason)) return { error: 'Invalid term season.' };
  if (!Number.isInteger(termYear) || termYear < 2000 || termYear > 2100) return { error: 'Invalid term year.' };
  if (!Number.isInteger(ratingQuality) || ratingQuality < 1 || ratingQuality > 5) return { error: 'Invalid quality rating.' };
  if (!allowedWorkloads.has(ratingWorkload)) return { error: 'Invalid workload rating.' };

  const base = {
    mode,
    professorName,
    reviewText,
    termSeason,
    termYear,
    ratingQuality,
    ratingWorkload: ratingWorkload as 'Light' | 'Moderate' | 'Heavy',
    termLabel: `${termSeason} ${termYear}`,
  };

  if (mode === 'existing') {
    const courseId = trimText(raw.courseId);
    if (!courseId) return { error: 'A course must be selected.' };

    return {
      value: {
        ...base,
        mode,
        courseId,
      },
    };
  }

  const courseName = trimText(raw.courseName);
  const categoryType = trimText(raw.categoryType);
  const language = trimText(raw.language);

  if (!courseName) return { error: 'Course name is required.' };
  if (!allowedCategories.has(categoryType)) return { error: 'Category is required.' };

  const normalizedCategory = normalizeCategory(categoryType);
  let trackName = trimText(raw.trackName);
  let usedForTrack: string | null = null;
  let usedForTrackCredit: boolean | null = null;

  if (normalizedCategory === 'Yenching') {
    if (!trackName) return { error: 'Track is required for Yenching courses.' };
  } else {
    usedForTrackCredit = Boolean(raw.usedForTrackCredit);
    if (usedForTrackCredit) {
      usedForTrack = trimText(raw.usedForTrack);
      if (!usedForTrack) return { error: 'Please select the track used for credit.' };
      trackName = usedForTrack;
    } else {
      trackName = 'General Elective';
    }
  }

  return {
    value: {
      ...base,
      mode,
      courseName,
      categoryType: normalizedCategory,
      trackName,
      language: language || null,
      usedForTrack,
      usedForTrackCredit,
    },
  };
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const timestamps = requestCounts.get(ip) ?? [];
  const next = timestamps.filter((value) => now - value < RATE_LIMIT_WINDOW_MS);

  if (next.length >= RATE_LIMIT_COUNT) {
    requestCounts.set(ip, next);
    return false;
  }

  next.push(now);
  requestCounts.set(ip, next);
  return true;
}

function getNextCourseId(courses: Pick<Course, 'course_id'>[]) {
  const numericOnly = courses
    .map((course) => Number.parseInt(course.course_id, 10))
    .filter((value) => Number.isInteger(value));

  if (numericOnly.length > 0) {
    return String(Math.max(...numericOnly) + 1);
  }

  const cPattern = courses
    .map((course) => /^C(\d+)$/i.exec(course.course_id))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => Number.parseInt(match[1], 10));

  if (cPattern.length > 0) {
    const nextValue = Math.max(...cPattern) + 1;
    return `C${String(nextValue).padStart(4, '0')}`;
  }

  return `USR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function findCourseByNameCaseInsensitive(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  courseName: string,
) {
  const { data, error } = await supabase
    .from('courses')
    .select('course_id, course_name, category_type, track_name')
    .ilike('course_name', courseName);

  if (error) {
    return { course: null, error: error.message };
  }

  const exact = (data ?? []).find((row) => (row.course_name as string | null)?.trim().toLowerCase() === courseName.toLowerCase()) as CourseRow | undefined;
  return { course: exact ?? null, error: null };
}

export async function POST(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many submissions. Please wait a few seconds.' }, { status: 429 });
  }

  const raw = (await request.json()) as SubmitReviewPayload;
  const parsed = sanitizePayload(raw);

  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase admin client is not configured. Missing SUPABASE_SERVICE_ROLE_KEY or Supabase URL.' },
      { status: 500 },
    );
  }

  let courseRow: CourseRow | null = null;

  if (parsed.value.mode === 'existing') {
    const { data: selectedCourse, error: selectedCourseError } = await supabase
      .from('courses')
      .select('course_id, course_name, category_type, track_name')
      .eq('course_id', parsed.value.courseId)
      .maybeSingle();

    if (selectedCourseError || !selectedCourse) {
      return NextResponse.json({ error: 'The selected course could not be found.' }, { status: 400 });
    }

    courseRow = selectedCourse as CourseRow;
  } else {
    const foundCourse = await findCourseByNameCaseInsensitive(supabase, parsed.value.courseName);
    if (foundCourse.error) {
      return NextResponse.json({ error: `Could not verify course: ${foundCourse.error}` }, { status: 500 });
    }

    if (foundCourse.course) {
      courseRow = foundCourse.course;
    } else {
      const { data: existingCourses, error: existingError } = await supabase
        .from('courses')
        .select('course_id');

      if (existingError) {
        return NextResponse.json({ error: `Could not generate course id: ${existingError.message}` }, { status: 500 });
      }

      const newCourseId = getNextCourseId((existingCourses ?? []) as Pick<Course, 'course_id'>[]);
      const now = new Date().toISOString();

      const { data: insertedCourse, error: insertedCourseError } = await supabase
        .from('courses')
        .insert({
          course_id: newCourseId,
          course_name: parsed.value.courseName,
          category_type: parsed.value.categoryType,
          track_name: parsed.value.trackName,
          language: parsed.value.language,
          legacy_course: false,
          created_at: now,
          updated_at: now,
        })
        .select('course_id, course_name, category_type, track_name')
        .single();

      if (insertedCourseError) {
        if (insertedCourseError.code === '23505') {
          const fallbackCourse = await findCourseByNameCaseInsensitive(supabase, parsed.value.courseName);
          if (fallbackCourse.course) {
            courseRow = fallbackCourse.course;
          } else {
            return NextResponse.json({ error: 'Duplicate course detected. Please try selecting the existing course.' }, { status: 409 });
          }
        } else {
          return NextResponse.json({ error: `Could not create course: ${insertedCourseError.message}` }, { status: 500 });
        }
      } else {
        courseRow = insertedCourse as CourseRow;
      }
    }
  }

  if (!courseRow) {
    return NextResponse.json({ error: 'Could not resolve course for review.' }, { status: 500 });
  }

  const usedForTrackCredit = parsed.value.mode === 'new' ? parsed.value.usedForTrackCredit : null;
  const usedForTrack = parsed.value.mode === 'new' ? parsed.value.usedForTrack : null;

  const { data: reviewRow, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      course_id: courseRow.course_id,
      course_name: courseRow.course_name,
      category_type: courseRow.category_type,
      track_name: courseRow.track_name,
      term_label: parsed.value.termLabel,
      term_year: parsed.value.termYear,
      term_season: parsed.value.termSeason,
      professor_name: parsed.value.professorName,
      review_text: parsed.value.reviewText,
      reviewer_display_name: null,
      is_anonymous: true,
      legacy_review: false,
      rating_quality: parsed.value.ratingQuality,
      rating_workload: parsed.value.ratingWorkload,
      used_for_track_credit: usedForTrackCredit,
      used_for_track: usedForTrack,
      created_at: new Date().toISOString(),
    })
    .select('review_id, course_id')
    .single();

  if (reviewError) {
    return NextResponse.json({ error: `Could not publish review: ${reviewError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Review published',
    reviewId: reviewRow.review_id,
    courseId: reviewRow.course_id,
  });
}
