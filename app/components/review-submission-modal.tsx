'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { Course } from '@/types/course';

type ReviewSubmissionModalProps = {
  mode: 'global' | 'selected' | null;
  courses: Course[];
  selectedCourse: Course | null;
  trackOptions: string[];
};

type SubmissionMode = 'existing' | 'new';

type FormState = {
  submissionMode: SubmissionMode;
  searchText: string;
  selectedCourseId: string;
  newCourseName: string;
  categoryType: 'Yenching' | 'PKU-Wide';
  trackName: string;
  usedForTrackCredit: boolean;
  usedForTrack: string;
  professorMode: 'existing' | 'new';
  professorName: string;
  selectedProfessor: string;
  termSeason: 'Fall' | 'Spring';
  termYear: string;
  ratingQuality: number;
  ratingWorkload: 'Light' | 'Moderate' | 'Heavy';
  reviewText: string;
};

const QUALITY_LABELS: Record<number, string> = {
  1: 'Do Not Take',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Amazing',
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

export function ReviewSubmissionModal({ mode, courses, selectedCourse, trackOptions }: ReviewSubmissionModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<FormState>(() => buildInitialState(mode, selectedCourse));
  const [professorOptions, setProfessorOptions] = useState<string[]>([]);
  const [isLoadingProfessors, setIsLoadingProfessors] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const normalizedSearch = state.searchText.trim().toLowerCase();
  const matchingCourses = useMemo(
    () =>
      normalizedSearch
        ? courses.filter((course) => course.course_name.toLowerCase().includes(normalizedSearch)).slice(0, 8)
        : courses.slice(0, 8),
    [courses, normalizedSearch],
  );

  const existingCourseNameSet = useMemo(
    () => new Set(courses.map((course) => course.course_name.trim().toLowerCase())),
    [courses],
  );

  const selectedCourseFromState = useMemo(
    () => courses.find((course) => course.course_id === state.selectedCourseId) ?? null,
    [courses, state.selectedCourseId],
  );

  const canCreateNewCourse = state.searchText.trim().length > 0 && !existingCourseNameSet.has(state.searchText.trim().toLowerCase());
  const isOpen = mode !== null;

  useEffect(() => {
    if (!isOpen) return;
    setState(buildInitialState(mode, selectedCourse));
    setFeedback(null);
  }, [isOpen, mode, selectedCourse]);

  useEffect(() => {
    if (!isOpen || state.submissionMode !== 'existing' || !state.selectedCourseId) {
      setProfessorOptions([]);
      return;
    }

    let active = true;
    setIsLoadingProfessors(true);
    fetch(`/api/reviews/professors?courseId=${encodeURIComponent(state.selectedCourseId)}`)
      .then((response) => response.json())
      .then((payload: { professors?: string[]; error?: string }) => {
        if (!active) return;
        if (payload.error) {
          setFeedback({ type: 'error', message: payload.error });
          setProfessorOptions([]);
          return;
        }
        setProfessorOptions(payload.professors ?? []);
      })
      .catch(() => {
        if (!active) return;
        setFeedback({ type: 'error', message: 'Could not load professor suggestions.' });
        setProfessorOptions([]);
      })
      .finally(() => {
        if (active) setIsLoadingProfessors(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, state.selectedCourseId, state.submissionMode]);

  if (!isOpen) return null;

  const effectiveCourse = state.submissionMode === 'existing' ? selectedCourseFromState : null;

  function closeModal() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('review_mode');

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function setForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function switchToExisting(course: Course) {
    setState((current) => ({
      ...current,
      submissionMode: 'existing',
      selectedCourseId: course.course_id,
      searchText: course.course_name,
      newCourseName: '',
      categoryType: 'Yenching',
      trackName: '',
      usedForTrackCredit: false,
      usedForTrack: '',
      professorMode: 'existing',
      professorName: '',
      selectedProfessor: '',
    }));
  }

  function switchToNewCourse() {
    const newCourseName = state.searchText.trim();
    setState((current) => ({
      ...current,
      submissionMode: 'new',
      selectedCourseId: '',
      newCourseName,
      categoryType: 'Yenching',
      trackName: '',
      usedForTrackCredit: false,
      usedForTrack: '',
      professorMode: 'new',
      selectedProfessor: '',
      professorName: '',
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const professorName = state.professorMode === 'existing' ? state.selectedProfessor : state.professorName;

    const payload =
      state.submissionMode === 'existing'
        ? {
            mode: 'existing' as const,
            courseId: state.selectedCourseId,
            professorName,
            termSeason: state.termSeason,
            termYear: Number(state.termYear),
            ratingQuality: state.ratingQuality,
            ratingWorkload: state.ratingWorkload,
            reviewText: state.reviewText,
          }
        : {
            mode: 'new' as const,
            courseName: state.newCourseName,
            categoryType: state.categoryType,
            trackName: state.trackName,
            usedForTrackCredit: state.categoryType === 'PKU-Wide' ? state.usedForTrackCredit : null,
            usedForTrack: state.categoryType === 'PKU-Wide' ? state.usedForTrack : null,
            professorName,
            termSeason: state.termSeason,
            termYear: Number(state.termYear),
            ratingQuality: state.ratingQuality,
            ratingWorkload: state.ratingWorkload,
            reviewText: state.reviewText,
          };

    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string; message?: string; courseId?: string };

    if (!response.ok) {
      setFeedback({ type: 'error', message: result.error ?? 'Could not publish review.' });
      return;
    }

    setFeedback({ type: 'success', message: 'Review published. Thank you for helping future students.' });

    const params = new URLSearchParams(searchParams.toString());
    params.delete('review_mode');
    if (result.courseId) {
      params.set('selected_course_id', result.courseId);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      router.refresh();
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={closeModal}>
      <div className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="review-modal-head">
          <h2 id="review-modal-title">{mode === 'selected' ? 'Write a Review' : 'Add Review'}</h2>
          <button type="button" className="modal-close" onClick={closeModal}>✕</button>
        </div>

        <form className="review-form" onSubmit={handleSubmit}>
          {mode === 'global' && (
            <section className="form-section">
              <label htmlFor="course-search">Search course name...</label>
              <input
                id="course-search"
                value={state.searchText}
                onChange={(event) => setForm('searchText', event.target.value)}
                placeholder="Search course name..."
              />

              {state.submissionMode === 'existing' ? (
                <p className="form-hint">Selected course: {effectiveCourse?.course_name}</p>
              ) : (
                <p className="form-hint">No matching course selected yet.</p>
              )}

              {matchingCourses.length > 0 && (
                <div className="suggestion-row">
                  {matchingCourses.map((course) => (
                    <button type="button" key={course.course_id} className="chip" onClick={() => switchToExisting(course)}>
                      {course.course_name}
                    </button>
                  ))}
                </div>
              )}

              {canCreateNewCourse && (
                <button type="button" className="link-button" onClick={switchToNewCourse}>
                  Create new course
                </button>
              )}
            </section>
          )}

          {(mode === 'selected' || state.submissionMode === 'existing') && effectiveCourse && (
            <section className="form-section">
              <div className="readonly-grid">
                <p><strong>Course:</strong> {effectiveCourse.course_name}</p>
                <p><strong>Category:</strong> {effectiveCourse.category_type ?? '—'}</p>
                <p><strong>Track:</strong> {effectiveCourse.track_name ?? '—'}</p>
              </div>
            </section>
          )}

          {state.submissionMode === 'new' && (
            <section className="form-section">
              <label htmlFor="new-course-name">Course name</label>
              <input id="new-course-name" value={state.newCourseName} onChange={(event) => setForm('newCourseName', event.target.value)} />

              <p className="field-title">Category</p>
              <div className="pill-row">
                {['Yenching', 'PKU-Wide'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`pill ${state.categoryType === value ? 'active' : ''}`}
                    onClick={() => setForm('categoryType', value as FormState['categoryType'])}
                  >
                    {value}
                  </button>
                ))}
              </div>

              {state.categoryType === 'Yenching' ? (
                <>
                  <label htmlFor="new-track">Track</label>
                  <select id="new-track" value={state.trackName} onChange={(event) => setForm('trackName', event.target.value)}>
                    <option value="">Select track</option>
                    {trackOptions.map((track) => (
                      <option key={track} value={track}>{track}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <p className="field-title">Did you use this course for track credit?</p>
                  <div className="pill-row">
                    <button type="button" className={`pill ${!state.usedForTrackCredit ? 'active' : ''}`} onClick={() => setForm('usedForTrackCredit', false)}>No</button>
                    <button type="button" className={`pill ${state.usedForTrackCredit ? 'active' : ''}`} onClick={() => setForm('usedForTrackCredit', true)}>Yes</button>
                  </div>

                  {state.usedForTrackCredit && (
                    <>
                      <label htmlFor="used-track">Used for track</label>
                      <select id="used-track" value={state.usedForTrack} onChange={(event) => setForm('usedForTrack', event.target.value)}>
                        <option value="">Select track</option>
                        {trackOptions.map((track) => (
                          <option key={track} value={track}>{track}</option>
                        ))}
                      </select>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          <section className="form-section">
            <p className="field-title">Select a professor</p>
            {state.submissionMode === 'existing' && isLoadingProfessors ? <p className="form-hint">Loading professors…</p> : null}

            {state.submissionMode === 'existing' && professorOptions.length > 0 && (
              <div className="suggestion-row">
                {professorOptions.map((professor) => (
                  <button
                    type="button"
                    key={professor}
                    className={`chip ${state.professorMode === 'existing' && state.selectedProfessor === professor ? 'active' : ''}`}
                    onClick={() => {
                      setForm('professorMode', 'existing');
                      setForm('selectedProfessor', professor);
                    }}
                  >
                    {professor}
                  </button>
                ))}
              </div>
            )}

            <button type="button" className="link-button" onClick={() => setForm('professorMode', 'new')}>Add new professor</button>

            {state.professorMode === 'new' || professorOptions.length === 0 ? (
              <input value={state.professorName} onChange={(event) => setForm('professorName', event.target.value)} placeholder="Professor name" />
            ) : null}
          </section>

          <section className="form-section split">
            <div>
              <p className="field-title">Term season</p>
              <div className="pill-row">
                {['Fall', 'Spring'].map((season) => (
                  <button key={season} type="button" className={`pill ${state.termSeason === season ? 'active' : ''}`} onClick={() => setForm('termSeason', season as FormState['termSeason'])}>
                    {season}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="term-year">Term year</label>
              <select id="term-year" value={state.termYear} onChange={(event) => setForm('termYear', event.target.value)}>
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="form-section">
            <p className="field-title">Quality rating (1–5)</p>
            <div className="pill-row quality-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" className={`pill ${state.ratingQuality === value ? 'active' : ''}`} onClick={() => setForm('ratingQuality', value)}>
                  {value} · {QUALITY_LABELS[value]}
                </button>
              ))}
            </div>

            <p className="field-title">Workload rating</p>
            <div className="pill-row">
              {['Light', 'Moderate', 'Heavy'].map((value) => (
                <button key={value} type="button" className={`pill ${state.ratingWorkload === value ? 'active' : ''}`} onClick={() => setForm('ratingWorkload', value as FormState['ratingWorkload'])}>
                  {value}
                </button>
              ))}
            </div>
          </section>

          <section className="form-section">
            <label htmlFor="review-text">Comment</label>
            <textarea
              id="review-text"
              value={state.reviewText}
              onChange={(event) => setForm('reviewText', event.target.value)}
              placeholder="Share your experience in the course. What should future students know?"
              rows={5}
            />
          </section>

          {feedback && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}

          <div className="review-modal-actions">
            <button type="submit" className="submit-button" disabled={isPending}>Publish Review</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function buildInitialState(mode: 'global' | 'selected' | null, selectedCourse: Course | null): FormState {
  const defaultYear = String(currentYear);

  if (mode === 'selected' && selectedCourse) {
    return {
      submissionMode: 'existing',
      searchText: selectedCourse.course_name,
      selectedCourseId: selectedCourse.course_id,
      newCourseName: '',
      categoryType: 'Yenching',
      trackName: '',
      usedForTrackCredit: false,
      usedForTrack: '',
      professorMode: 'existing',
      professorName: '',
      selectedProfessor: '',
      termSeason: 'Fall',
      termYear: defaultYear,
      ratingQuality: 4,
      ratingWorkload: 'Moderate',
      reviewText: '',
    };
  }

  return {
    submissionMode: 'existing',
    searchText: '',
    selectedCourseId: '',
    newCourseName: '',
    categoryType: 'Yenching',
    trackName: '',
    usedForTrackCredit: false,
    usedForTrack: '',
    professorMode: 'existing',
    professorName: '',
    selectedProfessor: '',
    termSeason: 'Fall',
    termYear: defaultYear,
    ratingQuality: 4,
    ratingWorkload: 'Moderate',
    reviewText: '',
  };
}
