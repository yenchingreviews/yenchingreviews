import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId')?.trim();

  if (!courseId) {
    return NextResponse.json({ professors: [] });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('professor_name')
    .eq('course_id', courseId)
    .not('professor_name', 'is', null);

  if (error) {
    return NextResponse.json({ error: `Could not load professors: ${error.message}` }, { status: 500 });
  }

  const professors = Array.from(
    new Set(
      (data ?? [])
        .map((row) => (row.professor_name as string | null)?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ professors });
}
