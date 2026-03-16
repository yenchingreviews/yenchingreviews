'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { formatCategoryLabel, isYenchingCategory } from '@/app/components/category-label';
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
  termSeason: 'Fall' | 'Spring' | null;
  termYear: string;
  ratingQuality: number | null;
  ratingWorkload: 'Light' | 'Moderate' | 'Heavy' | null;
  reviewText: string;
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
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const [isTermMenuOpen, setIsTermMenuOpen] = useState(false);
  const [isNewTrackMenuOpen, setIsNewTrackMenuOpen] = useState(false);
  const [isUsedTrackMenuOpen, setIsUsedTrackMenuOpen] = useState(false);
  const [isProfessorMenuOpen, setIsProfessorMenuOpen] = useState(false);
  const [professorCache, setProfessorCache] = useState<Record<string, string[]>>({});
  const yearDropdownRef = useRef<HTMLDivElement | null>(null);
  const termDropdownRef = useRef<HTMLDivElement | null>(null);
  const newTrackDropdownRef = useRef<HTMLDivElement | null>(null);
  const usedTrackDropdownRef = useRef<HTMLDivElement | null>(null);
  const professorDropdownRef = useRef<HTMLDivElement | null>(null);

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

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [isOpen]);
  const isCreateMode = mode === 'global' && state.submissionMode === 'new';
  const hasSelectedExistingCourse = state.submissionMode === 'existing' && Boolean(state.selectedCourseId);

  const professorUiState = useMemo(() => {
    if (state.submissionMode === 'new') return 'input';
    if (!hasSelectedExistingCourse) return 'disabled';
    if (state.professorMode === 'new') return 'input';
    return 'dropdown';
  }, [hasSelectedExistingCourse, state.professorMode, state.submissionMode]);

  const professorDropdownOptions = useMemo(() => {
    if (state.submissionMode === 'new') return [];
    return professorOptions;
  }, [professorOptions, state.submissionMode]);

  useEffect(() => {
    if (!isOpen) return;
    setState(buildInitialState(mode, selectedCourse));
    setFeedback(null);
    setIsCourseDropdownOpen(false);
    setIsProfessorMenuOpen(false);
    setIsSubmitted(false);
    setDidAttemptSubmit(false);
  }, [isOpen, mode, selectedCourse]);

  const normalizeProfessorOptions = useCallback((options: string[]) => {
    return options
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name, index, all) => all.indexOf(name) === index);
  }, []);

  const applyProfessorOptions = useCallback((options: string[]) => {
    const normalizedOptions = normalizeProfessorOptions(options);
    setProfessorOptions(normalizedOptions);
    setState((current) => {
      if (current.professorMode === 'new') return current;
      if (current.selectedProfessor && normalizedOptions.includes(current.selectedProfessor)) return current;
      return { ...current, selectedProfessor: normalizedOptions[0] ?? '' };
    });
  }, [normalizeProfessorOptions]);

  useEffect(() => {
    if (!isOpen || state.submissionMode !== 'existing' || !state.selectedCourseId) {
      setProfessorOptions([]);
      setIsLoadingProfessors(false);
      return;
    }

    const cachedProfessors = professorCache[state.selectedCourseId];
    if (cachedProfessors) {
      applyProfessorOptions(cachedProfessors);
      setIsLoadingProfessors(false);
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
        const nextProfessors = payload.professors ?? [];
        applyProfessorOptions(nextProfessors);
        setProfessorCache((current) => ({ ...current, [state.selectedCourseId]: nextProfessors }));
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
  }, [applyProfessorOptions, isOpen, professorCache, state.selectedCourseId, state.submissionMode]);

  function prefetchProfessors(courseId: string) {
    if (!courseId || professorCache[courseId]) return;

    fetch(`/api/reviews/professors?courseId=${encodeURIComponent(courseId)}`)
      .then((response) => response.json())
      .then((payload: { professors?: string[]; error?: string }) => {
        if (payload.error) return;
        setProfessorCache((current) => {
          if (current[courseId]) return current;
          return { ...current, [courseId]: payload.professors ?? [] };
        });
      })
      .catch(() => {
        // Prefetch failures should not interrupt manual selection flow.
      });
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!yearDropdownRef.current?.contains(event.target as Node)) {
        setIsYearMenuOpen(false);
      }
      if (!termDropdownRef.current?.contains(event.target as Node)) {
        setIsTermMenuOpen(false);
      }
      if (!newTrackDropdownRef.current?.contains(event.target as Node)) {
        setIsNewTrackMenuOpen(false);
      }
      if (!usedTrackDropdownRef.current?.contains(event.target as Node)) {
        setIsUsedTrackMenuOpen(false);
      }
      if (!professorDropdownRef.current?.contains(event.target as Node)) {
        setIsProfessorMenuOpen(false);
      }
    }

    if (isYearMenuOpen || isTermMenuOpen || isNewTrackMenuOpen || isUsedTrackMenuOpen || isProfessorMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isYearMenuOpen, isTermMenuOpen, isNewTrackMenuOpen, isUsedTrackMenuOpen, isProfessorMenuOpen]);

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
    const cachedProfessors = professorCache[course.course_id];
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
      selectedProfessor: cachedProfessors?.[0] ?? '',
    }));
    applyProfessorOptions(cachedProfessors ?? []);
    setIsLoadingProfessors(!cachedProfessors);
    setIsCourseDropdownOpen(false);
    setIsProfessorMenuOpen(false);
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
    setIsProfessorMenuOpen(false);
  }

  function returnToCourseSearch() {
    setState((current) => ({
      ...current,
      submissionMode: 'existing',
      selectedCourseId: '',
      newCourseName: '',
      categoryType: 'Yenching',
      trackName: '',
      newCourseLanguage: '',
      usedForTrackCredit: false,
      usedForTrack: '',
      professorMode: 'existing',
      selectedProfessor: '',
      professorName: '',
    }));
    setIsCourseDropdownOpen(true);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDidAttemptSubmit(true);
    setFeedback(null);

    const professorName = state.submissionMode === 'new' ? state.professorName : (state.professorMode === 'existing' ? state.selectedProfessor : state.professorName);

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

    if (state.termSeason === null) {
      setFeedback({ type: 'error', message: 'Please select whether you took the course in Fall or Spring.' });
      return;
    }

    if (!state.termYear) {
      setFeedback({ type: 'error', message: 'Please select the year you took this course.' });
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
          <button type="button" className="modal-close" aria-label="Close review modal" onClick={closeModal}>✕</button>
        </div>

        {isSubmitted ? (
          <div className="review-success-state">
            <div className="success-check" aria-hidden="true">✓</div>
            <p className="success-title">Thanks for your submission. You&apos;re helping future students.</p>
          </div>
        ) : (
        <form className="review-form" onSubmit={handleSubmit}>
          {mode === 'global' && !isCreateMode && (
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
                          <button
                            type="button"
                            key={course.course_id}
                            className="autocomplete-option"
                            onMouseEnter={() => prefetchProfessors(course.course_id)}
                            onFocus={() => prefetchProfessors(course.course_id)}
                            onClick={() => switchToExisting(course)}
                          >
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

          {isCreateMode && (
            <section className="form-section create-mode-shell">
              <div className="create-mode-card">
                <button type="button" className="back-to-search" onClick={returnToCourseSearch}>
                  ← Back to search
                </button>
                <p className="question-heading">1. Create a new course</p>
                <p className="create-mode-helper">Add a course that doesn&apos;t yet exist in the database.</p>

                <div className="new-course-section">
                  <label htmlFor="new-course-name">Course name</label>
                  <input id="new-course-name" value={state.newCourseName} onChange={(event) => setForm('newCourseName', event.target.value)} />

                  <p className="field-title">Category</p>
                  <div className="pill-row">
                    {['Yenching', 'PKU-Wide'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`pill category-pill ${isYenchingCategory(value) ? 'is-yenching' : 'is-pku'} ${state.categoryType === value ? 'active' : ''}`}
                        onClick={() => setForm('categoryType', value as FormState['categoryType'])}
                      >
                        {formatCategoryLabel(value)}
                      </button>
                    ))}
                  </div>

                  {state.categoryType === 'Yenching' ? (
                    <>
                      <label htmlFor="new-track">Track</label>
                      <div className="track-dropdown-wrap" ref={newTrackDropdownRef}>
                        <button
                          id="new-track"
                          type="button"
                          className={`filter-control track-dropdown-trigger ${isNewTrackMenuOpen ? 'open' : ''}`}
                          onClick={() => setIsNewTrackMenuOpen((open) => !open)}
                          aria-haspopup="listbox"
                          aria-expanded={isNewTrackMenuOpen}
                        >
                          <span className="track-trigger-label">
                            {state.trackName ? (
                              <span className="track-trigger-selected">
                                <span className={`track-dot ${trackToken(state.trackName)}`} aria-hidden="true" />
                                <span>{state.trackName}</span>
                              </span>
                            ) : (
                              'Select track'
                            )}
                          </span>
                          <span aria-hidden="true" className="track-dropdown-caret">▾</span>
                        </button>

                        {isNewTrackMenuOpen && (
                          <div className="track-dropdown-menu" role="listbox" aria-label="Select track">
                            {trackOptions.map((track) => {
                              const active = state.trackName === track;
                              return (
                                <button
                                  key={track}
                                  type="button"
                                  className={`filter-control track-option ${active ? 'active' : ''}`}
                                  onClick={() => {
                                    setForm('trackName', track);
                                    setIsNewTrackMenuOpen(false);
                                  }}
                                >
                                  <span className={`track-dot ${trackToken(track)}`} aria-hidden="true" />
                                  <span>{track}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
                          <div className="track-dropdown-wrap" ref={usedTrackDropdownRef}>
                            <button
                              id="used-track"
                              type="button"
                              className={`filter-control track-dropdown-trigger ${isUsedTrackMenuOpen ? 'open' : ''}`}
                              onClick={() => setIsUsedTrackMenuOpen((open) => !open)}
                              aria-haspopup="listbox"
                              aria-expanded={isUsedTrackMenuOpen}
                            >
                              <span className="track-trigger-label">
                                {state.usedForTrack ? (
                                  <span className="track-trigger-selected">
                                    <span className={`track-dot ${trackToken(state.usedForTrack)}`} aria-hidden="true" />
                                    <span>{state.usedForTrack}</span>
                                  </span>
                                ) : (
                                  'Select track'
                                )}
                              </span>
                              <span aria-hidden="true" className="track-dropdown-caret">▾</span>
                            </button>

                            {isUsedTrackMenuOpen && (
                              <div className="track-dropdown-menu" role="listbox" aria-label="Select used track">
                                {trackOptions.map((track) => {
                                  const active = state.usedForTrack === track;
                                  return (
                                    <button
                                      key={track}
                                      type="button"
                                      className={`filter-control track-option ${active ? 'active' : ''}`}
                                      onClick={() => {
                                        setForm('usedForTrack', track);
                                        setIsUsedTrackMenuOpen(false);
                                      }}
                                    >
                                      <span className={`track-dot ${trackToken(track)}`} aria-hidden="true" />
                                      <span>{track}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <p className="field-title">Language</p>
                  <div className="filter-row">
                    {['Chinese', 'English'].map((language) => (
                      <button
                        key={language}
                        type="button"
                        className={`filter-control filter-bubble language ${state.newCourseLanguage === language ? 'active' : ''}`}
                        onClick={() => setForm('newCourseLanguage', language)}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {(mode === 'selected' || state.submissionMode === 'existing') && effectiveCourse && (
            <section className={`form-section selected-course-section ${mode === 'selected' ? 'with-question' : ''}`}>
              {mode === 'selected' ? <p className="question-heading">1. Which course would you like to review?</p> : null}
              <div className="selected-course-card">
                {mode === 'global' && (
                  <button type="button" className="selected-course-clear" aria-label="Clear selected course" onClick={clearSelectedCourse}>✕</button>
                )}
                <p className="selected-course-name">{effectiveCourse.course_name}</p>
                <div className="selected-course-tags">
                  {effectiveCourse.category_type && (
                    <span className={`tag category ${isYenchingCategory(effectiveCourse.category_type) ? 'is-yenching' : 'is-pku'}`}>
                      {formatCategoryLabel(effectiveCourse.category_type)}
                    </span>
                  )}
                  {effectiveCourse.track_name && <span className={`tag ${trackToken(effectiveCourse.track_name)}`}>{effectiveCourse.track_name}</span>}
                  {effectiveCourse.language && <span className="tag language">{effectiveCourse.language}</span>}
                </div>
              </div>
            </section>
          )}

          <section className="form-section">
            <p className="question-heading">2. Which professor taught this course?</p>

            {professorUiState === 'dropdown' && state.submissionMode === 'existing' && isLoadingProfessors && (
              <div className="professor-loading-shell" aria-live="polite" aria-busy="true">
                <div className="professor-skeleton" />
              </div>
            )}

            {professorUiState === 'disabled' && (
              <>
                <div className="track-dropdown-wrap professor-dropdown" ref={professorDropdownRef}>
                  <button
                    id="professor-select"
                    type="button"
                    className="filter-control track-dropdown-trigger"
                    disabled
                    aria-disabled="true"
                  >
                    <span className="track-trigger-label">Select professor</span>
                    <span aria-hidden="true" className="track-dropdown-caret">▾</span>
                  </button>
                </div>
                <p className="form-hint form-hint-subtle">Select a course first to choose or add a professor.</p>
              </>
            )}

            {professorUiState === 'dropdown' && !isLoadingProfessors && (
              <div className="track-dropdown-wrap professor-dropdown" ref={professorDropdownRef}>
                <button
                  id="professor-select"
                  type="button"
                  className={`filter-control track-dropdown-trigger ${isProfessorMenuOpen ? 'open' : ''}`}
                  onClick={() => setIsProfessorMenuOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={isProfessorMenuOpen}
                >
                  <span className="track-trigger-label">{state.selectedProfessor || 'Select professor'}</span>
                  <span aria-hidden="true" className="track-dropdown-caret">▾</span>
                </button>

                {isProfessorMenuOpen && (
                  <div className="track-dropdown-menu" role="listbox" aria-label="Select professor">
                    {professorDropdownOptions.map((professor) => {
                      const active = state.selectedProfessor === professor;
                      return (
                        <button
                          key={professor}
                          type="button"
                          className={`filter-control track-option ${active ? 'active' : ''}`}
                          onClick={() => {
                            setForm('professorMode', 'existing');
                            setForm('selectedProfessor', professor);
                            setIsProfessorMenuOpen(false);
                          }}
                        >
                          <span>{professor}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className="filter-control track-option add-new-course-option"
                      onClick={() => {
                        setForm('professorMode', 'new');
                        setIsProfessorMenuOpen(false);
                      }}
                    >
                      + Add professor
                    </button>
                  </div>
                )}
              </div>
            )}

            {professorUiState === 'input' && (
              <div className="inline-input-action professor-input">
                <input
                  value={state.professorName}
                  onChange={(event) => setForm('professorName', event.target.value)}
                  placeholder="Professor name"
                  autoFocus
                />
              </div>
            )}
          </section>

          <section className="form-section">
            <p className="question-heading">3. When did you take this course?</p>
            <div className="term-control-row">
              <div className="term-control-group">
                <p className="question-subheading">Term</p>
                <div className="track-dropdown-wrap term-dropdown" ref={termDropdownRef}>
                  <button
                    id="term-season"
                    type="button"
                    className={`filter-control track-dropdown-trigger term-pill ${isTermMenuOpen ? 'open' : ''}`}
                    onClick={() => setIsTermMenuOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={isTermMenuOpen}
                  >
                    <span>{state.termSeason ?? 'Select term'}</span>
                    <span aria-hidden="true" className="term-year-caret">▾</span>
                  </button>

                  {isTermMenuOpen && (
                    <div className="track-dropdown-menu term-year-menu" role="listbox" aria-label="Select term season">
                      {['Fall', 'Spring'].map((season) => {
                        const active = state.termSeason === season;
                        return (
                          <button
                            key={season}
                            type="button"
                            className={`filter-control track-option term-year-option ${active ? 'active' : ''}`}
                            onClick={() => {
                              setForm('termSeason', season as FormState['termSeason']);
                              setIsTermMenuOpen(false);
                            }}
                          >
                            {season}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="term-control-group">
                <p className="question-subheading">Year</p>
                <div className="track-dropdown-wrap term-year-dropdown" ref={yearDropdownRef}>
                <button
                  id="term-year"
                  type="button"
                  className={`filter-control track-dropdown-trigger term-year-pill ${isYearMenuOpen ? 'open' : ''}`}
                  onClick={() => setIsYearMenuOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={isYearMenuOpen}
                >
                  <span>{state.termYear || 'Select year'}</span>
                  <span aria-hidden="true" className="term-year-caret">▾</span>
                </button>

                {isYearMenuOpen && (
                  <div className="track-dropdown-menu term-year-menu" role="listbox" aria-label="Select term year">
                    {YEAR_OPTIONS.map((year) => {
                      const value = String(year);
                      const active = state.termYear === value;
                      return (
                        <button
                          key={year}
                          type="button"
                          className={`filter-control track-option term-year-option ${active ? 'active' : ''}`}
                          onClick={() => {
                            setForm('termYear', value);
                            setIsYearMenuOpen(false);
                          }}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                )}
                </div>
              </div>
            </div>
          </section>

          <section className="form-section">
            <p className="question-heading">4. How would you rate the quality of this course?</p>
            <div className="quality-scale" role="radiogroup" aria-label="Course quality rating">
              <span className="quality-anchor">Do not take</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" className={`pill quality-pill ${state.ratingQuality === value ? 'active' : ''}`} onClick={() => setForm('ratingQuality', value)}>
                  {value}
                </button>
              ))}
              <span className="quality-anchor">Amazing</span>
            </div>
          </section>

          <section className="form-section">
            <p className="question-heading">5. How would you describe the workload?</p>
            <div className="pill-row workload-row">
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
              rows={8}
              required
              minLength={10}
              aria-invalid={didAttemptSubmit && reviewIsTooShort}
            />
            {didAttemptSubmit && reviewIsTooShort ? <p className="form-hint review-text-hint">Please write at least 10 characters.</p> : null}
          </section>

          {feedback && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}

          <div className="review-modal-actions">
            <button type="submit" className="submit-button action-control btn-publish" disabled={isPending}>Publish Review</button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

function buildInitialState(mode: 'global' | 'selected' | null, selectedCourse: Course | null): FormState {
  const defaultYear = '';

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
      termSeason: null,
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
    termSeason: null,
    termYear: defaultYear,
    ratingQuality: null,
    ratingWorkload: null,
    reviewText: '',
  };
}
