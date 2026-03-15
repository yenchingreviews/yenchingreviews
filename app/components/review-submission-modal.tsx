'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { trackToken } from '@/app/components/track-token';
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
  newCourseLanguage: string;
  usedForTrackCredit: boolean;
  usedForTrack: string;
  professorMode: 'existing' | 'new';
  professorName: string;
  selectedProfessor: string;
  termSeason: 'Fall' | 'Spring';
  termYear: string;
  ratingQuality: number | null;
  ratingWorkload: 'Light' | 'Moderate' | 'Heavy' | null;
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
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [didAttemptSubmit, setDidAttemptSubmit] = useState(false);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.course_name.localeCompare(b.course_name)),
    [courses],
  );

  const normalizedSearch = state.searchText.trim().toLowerCase();
  const hasTypedCourseSearch = state.searchText.trim().length > 0;
  const matchingCourses = useMemo(
    () =>
      normalizedSearch
        ? sortedCourses.filter((course) => course.course_name.toLowerCase().includes(normalizedSearch)).slice(0, 5)
        : [],
    [sortedCourses, normalizedSearch],
  );

  const existingCourseNameSet = useMemo(
    () => new Set(courses.map((course) => course.course_name.trim().toLowerCase())),
    [courses],
  );

  const selectedCourseFromState = useMemo(
    () => courses.find((course) => course.course_id === state.selectedCourseId) ?? (mode === 'selected' ? selectedCourse : null),
    [courses, mode, selectedCourse, state.selectedCourseId],
  );

  const canCreateNewCourse = state.searchText.trim().length > 0 && !existingCourseNameSet.has(state.searchText.trim().toLowerCase());
  const reviewIsTooShort = state.reviewText.trim().length < 10;
  const isOpen = mode !== null;

  useEffect(() => {
    if (!isOpen) return;
    setState(buildInitialState(mode, selectedCourse));
    setFeedback(null);
    setIsCourseDropdownOpen(false);
    setIsSubmitted(false);
    setDidAttemptSubmit(false);
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
      newCourseLanguage: '',
      usedForTrackCredit: false,
      usedForTrack: '',
      professorMode: 'existing',
      professorName: '',
      selectedProfessor: '',
    }));
    setIsCourseDropdownOpen(false);
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
      newCourseLanguage: '',
      usedForTrackCredit: false,
      usedForTrack: '',
      professorMode: 'new',
      selectedProfessor: '',
      professorName: '',
    }));
    setIsCourseDropdownOpen(false);
  }

  function clearSelectedCourse() {
    setState((current) => ({
      ...current,
      submissionMode: 'existing',
      selectedCourseId: '',
      searchText: '',
      newCourseName: '',
      newCourseLanguage: '',
      professorMode: 'existing',
      selectedProfessor: '',
      professorName: '',
    }));
    setIsCourseDropdownOpen(true);
  }

  function addNewProfessor() {
    const trimmedProfessor = state.professorName.trim();
    if (!trimmedProfessor) return;

    setProfessorOptions((current) => (current.includes(trimmedProfessor) ? current : [...current, trimmedProfessor]));
    setState((current) => ({
      ...current,
      professorMode: 'existing',
      selectedProfessor: trimmedProfessor,
      professorName: '',
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDidAttemptSubmit(true);
    setFeedback(null);

    const professorName = state.professorMode === 'existing' ? state.selectedProfessor : state.professorName;

    if (state.reviewText.trim().length < 10) {
      setFeedback({ type: 'error', message: 'Please write at least 10 characters for your response.' });
      return;
    }

    if (state.ratingQuality === null) {
      setFeedback({ type: 'error', message: 'Please select a quality rating.' });
      return;
    }

    if (state.ratingWorkload === null) {
      setFeedback({ type: 'error', message: 'Please select a workload rating.' });
      return;
    }

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
            language: state.newCourseLanguage,
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

    setFeedback(null);
    setIsSubmitted(true);

    startTransition(() => {
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

        {isSubmitted ? (
          <div className="review-success-state">
            <div className="success-check" aria-hidden="true">✓</div>
            <p className="success-title">Thanks for your submission. You&apos;re helping future students.</p>
          </div>
        ) : (
        <form className="review-form" onSubmit={handleSubmit}>
          {mode === 'global' && (
            <section className="form-section">
              <p className="question-heading">1. Which course would you like to review?</p>
              {!effectiveCourse && (
                <div className="autocomplete-wrap">
                  <input
                    id="course-search"
                    value={state.searchText}
                    onChange={(event) => {
                      setForm('searchText', event.target.value);
                      if (state.submissionMode === 'new') {
                        setForm('submissionMode', 'existing');
                        setForm('newCourseName', '');
                      }
                      setForm('selectedCourseId', '');
                      setIsCourseDropdownOpen(true);
                    }}
                    onFocus={() => setIsCourseDropdownOpen(true)}
                    placeholder="Search course name..."
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isCourseDropdownOpen}
                    aria-controls="course-search-options"
                  />

                  {isCourseDropdownOpen && (
                    <div id="course-search-options" className="autocomplete-dropdown" role="listbox">
                      {hasTypedCourseSearch && matchingCourses.length > 0 ? (
                        matchingCourses.map((course) => (
                          <button type="button" key={course.course_id} className="autocomplete-option" onClick={() => switchToExisting(course)}>
                            {course.course_name}
                          </button>
                        ))
                      ) : hasTypedCourseSearch ? (
                        <p className="autocomplete-empty">No matching courses found.</p>
                      ) : null}

                      {hasTypedCourseSearch && canCreateNewCourse ? (
                        <button type="button" className="autocomplete-option add-new-course-option" onClick={switchToNewCourse}>
                          Can&apos;t find it? Add a new course
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {(mode === 'selected' || state.submissionMode === 'existing') && effectiveCourse && (
            <section className="form-section">
              {mode === 'selected' ? <p className="question-heading">1. Which course would you like to review?</p> : null}
              <div className="selected-course-card">
                {mode === 'global' && (
                  <button type="button" className="selected-course-clear" aria-label="Clear selected course" onClick={clearSelectedCourse}>✕</button>
                )}
                <p className="selected-course-name">{effectiveCourse.course_name}</p>
                <div className="selected-course-tags">
                  {effectiveCourse.category_type && (
                    <span className={`tag category ${effectiveCourse.category_type === 'Yenching' ? 'is-yenching' : 'is-pku'}`}>
                      {effectiveCourse.category_type}
                    </span>
                  )}
                  {effectiveCourse.track_name && <span className={`tag ${trackToken(effectiveCourse.track_name)}`}>{effectiveCourse.track_name}</span>}
                  {effectiveCourse.language && <span className="tag language">{effectiveCourse.language}</span>}
                </div>
              </div>
            </section>
          )}

          {state.submissionMode === 'new' && (
            <section className="form-section new-course-section">
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

              <label htmlFor="new-language">Language</label>
              <select id="new-language" value={state.newCourseLanguage} onChange={(event) => setForm('newCourseLanguage', event.target.value)}>
                <option value="">Select language</option>
                <option value="English">English</option>
                <option value="Chinese">Chinese</option>
                <option value="Bilingual">Bilingual</option>
                <option value="Other">Other</option>
              </select>
            </section>
          )}

          <section className="form-section">
            <p className="question-heading">2. Which professor taught this course?</p>
            {state.submissionMode === 'existing' && isLoadingProfessors ? <p className="form-hint">Loading professors…</p> : null}

            {state.submissionMode === 'existing' && professorOptions.length > 0 && (
              <div className="professor-choice-row">
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
                {state.professorMode === 'new' ? (
                  <div className="chip professor-inline-editor">
                    <input
                      value={state.professorName}
                      onChange={(event) => setForm('professorName', event.target.value)}
                      placeholder="Professor name"
                      autoFocus
                    />
                    <button type="button" className="professor-inline-submit" onClick={addNewProfessor} disabled={!state.professorName.trim()}>
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="chip secondary-chip"
                    onClick={() => setForm('professorMode', 'new')}
                  >
                    Add new professor
                  </button>
                )}
              </div>
            )}

            {(state.professorMode === 'new' || professorOptions.length === 0) && professorOptions.length === 0 && (
              <div className="inline-input-action fused">
                <input value={state.professorName} onChange={(event) => setForm('professorName', event.target.value)} placeholder="Professor name" />
                <button type="button" className="danger-button" onClick={addNewProfessor} disabled={!state.professorName.trim()}>
                  Submit
                </button>
              </div>
            )}
          </section>

          <section className="form-section">
            <p className="question-heading">3. When did you take this course?</p>
            <div className="term-control-row centered-answer-row">
              {['Fall', 'Spring'].map((season) => (
                <button key={season} type="button" className={`pill ${state.termSeason === season ? 'active' : ''}`} onClick={() => setForm('termSeason', season as FormState['termSeason'])}>
                  {season}
                </button>
              ))}
              <select id="term-year" className="term-year-pill" value={state.termYear} onChange={(event) => setForm('termYear', event.target.value)}>
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="form-section">
            <p className="question-heading">4. How would you rate the quality of this course?</p>
            <div className="pill-row quality-row centered-answer-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" className={`pill ${state.ratingQuality === value ? 'active' : ''}`} onClick={() => setForm('ratingQuality', value)}>
                  {value} · {QUALITY_LABELS[value]}
                </button>
              ))}
            </div>
          </section>

          <section className="form-section">
            <p className="question-heading">5. How would you describe the workload?</p>
            <div className="pill-row centered-answer-row">
              {['Light', 'Moderate', 'Heavy'].map((value) => (
                <button key={value} type="button" className={`pill ${state.ratingWorkload === value ? 'active' : ''}`} onClick={() => setForm('ratingWorkload', value as FormState['ratingWorkload'])}>
                  {value}
                </button>
              ))}
            </div>
          </section>

          <section className="form-section">
            <p className="question-heading">6. What should future students know about this course?<span className="required-inline">* (10 character min.)</span></p>
            <textarea
              id="review-text"
              value={state.reviewText}
              onChange={(event) => {
                setForm('reviewText', event.target.value);
                if (didAttemptSubmit) setDidAttemptSubmit(false);
              }}
              placeholder="Share your experience…"
              rows={5}
              required
              minLength={10}
              aria-invalid={didAttemptSubmit && reviewIsTooShort}
            />
            {didAttemptSubmit && reviewIsTooShort ? <p className="form-hint review-text-hint">Please write at least 10 characters.</p> : null}
          </section>

          {feedback && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}

          <div className="review-modal-actions">
            <button type="submit" className="submit-button" disabled={isPending}>Publish Review</button>
          </div>
        </form>
        )}
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
      newCourseLanguage: '',
      usedForTrackCredit: false,
      usedForTrack: '',
      professorMode: 'existing',
      professorName: '',
      selectedProfessor: '',
      termSeason: 'Fall',
      termYear: defaultYear,
      ratingQuality: null,
      ratingWorkload: null,
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
    newCourseLanguage: '',
    usedForTrackCredit: false,
    usedForTrack: '',
    professorMode: 'existing',
    professorName: '',
    selectedProfessor: '',
    termSeason: 'Fall',
    termYear: defaultYear,
    ratingQuality: null,
    ratingWorkload: null,
    reviewText: '',
  };
}
