'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { trackToken } from '@/app/components/track-token';

type CourseFiltersProps = {
  selected: {
    categoryTypes: string[];
    trackNames: string[];
    languages: string[];
  };
  options: {
    categories: string[];
    tracks: string[];
    languages: string[];
  };
};

// Keep query param helpers defined once in this file (single source of truth).
function parseParamList(value: string | null) {
  if (!value) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function serializeParamList(values: string[]) {
  return values.join(',');
}

export function CourseFilters({ selected, options }: CourseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isTrackMenuOpen, setIsTrackMenuOpen] = useState(false);

  const trackDropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedTrack = selected.trackNames[0] ?? '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!trackDropdownRef.current?.contains(event.target as Node)) {
        setIsTrackMenuOpen(false);
      }
    }

    if (isTrackMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTrackMenuOpen]);

  function pushParamList(name: string, values: string[]) {
    const params = new URLSearchParams(searchParams.toString());

    if (values.length > 0) {
      params.set(name, serializeParamList(values));
    } else {
      params.delete(name);
    }

    params.delete('selected_course_id');

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function toggleFilter(name: string, value: string) {
    const currentValues = parseParamList(searchParams.get(name));
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((entry) => entry !== value)
      : [...currentValues, value];

    pushParamList(name, nextValues);
  }

  function selectSingleFilter(name: string, value: string) {
    pushParamList(name, [value]);
  }

  function resetGroup(name: string) {
    pushParamList(name, []);
  }

  function resetAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('category_type');
    params.delete('track_name');
    params.delete('language');
    params.delete('selected_course_id');

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function FilterBubble({
    label,
    value,
    selectedValues,
    className,
    onPick,
  }: {
    label: string;
    value: string;
    selectedValues: string[];
    className?: string;
    onPick: (value: string) => void;
  }) {
    const active = selectedValues.includes(value);
    return (
      <button
        type="button"
        className={`tag filter-tag ${className ?? ''} ${active ? 'active' : ''}`}
        onClick={() => onPick(value)}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  }

  const anyFilterActive = selected.categoryTypes.length > 0 || selected.trackNames.length > 0 || selected.languages.length > 0;

  return (
    <section className="filter-panel">
      <div className="panel-header-row filters-header-row">
        <h2 className="panel-title panel-title-filters">Filters</h2>
        <button type="button" className={`clear-filters ${anyFilterActive ? 'is-active' : ''}`} onClick={resetAll}>
          Clear All
        </button>
      </div>

      <div className="filter-group">
        <h3>Yenching or PKU-Wide</h3>
        <div className="filter-row">
          {options.categories.map((category) => (
            <FilterBubble
              key={category}
              label={category}
              value={category}
              selectedValues={selected.categoryTypes}
              onPick={(value) => toggleFilter('category_type', value)}
              className={`category ${category === 'Yenching' ? 'is-yenching' : 'is-pku'}`}
            />
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h3>Track</h3>
        <div className="track-dropdown-wrap" ref={trackDropdownRef}>
          <button
            type="button"
            className={`track-dropdown-trigger ${isTrackMenuOpen ? 'open' : ''}`}
            onClick={() => setIsTrackMenuOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={isTrackMenuOpen}
          >
            <span className="track-trigger-label">
              {selectedTrack ? (
                <span className="track-trigger-selected">
                  <span className={`track-dot ${trackToken(selectedTrack)}`} aria-hidden="true" />
                  <span>{selectedTrack}</span>
                </span>
              ) : (
                'Filter by track'
              )}
            </span>
            <span className="track-trigger-actions">
              {selectedTrack && (
                <span
                  role="button"
                  tabIndex={0}
                  className="track-clear"
                  aria-label="Clear selected track"
                  onClick={(event) => {
                    event.stopPropagation();
                    resetGroup('track_name');
                    setIsTrackMenuOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      resetGroup('track_name');
                      setIsTrackMenuOpen(false);
                    }
                  }}
                >
                  ✕
                </span>
              )}
              <span aria-hidden="true" className="track-dropdown-caret">▾</span>
            </span>
          </button>

          {isTrackMenuOpen && (
            <div className="track-dropdown-menu" role="listbox" aria-label="Filter by track">
              <button
                type="button"
                className={`track-option ${selected.trackNames.length === 0 ? 'active' : ''}`}
                onClick={() => resetGroup('track_name')}
              >
                <span className="track-dot track-neutral" aria-hidden="true" />
                <span>All tracks</span>
              </button>

              {options.tracks.map((track) => (
                <button
                  key={track}
                  type="button"
                  className={`track-option ${selectedTrack === track ? 'active' : ''}`}
                  onClick={() => {
                    selectSingleFilter('track_name', track);
                    setIsTrackMenuOpen(false);
                  }}
                >
                  <span className={`track-dot ${trackToken(track)}`} aria-hidden="true" />
                  <span>{track}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="filter-group">
        <h3>Language</h3>
        <div className="filter-row">
          <button
            type="button"
            className={`tag filter-tag all-tag ${selected.languages.length === 0 ? 'active all-active' : ''}`}
            onClick={() => resetGroup('language')}
          >
            All
          </button>
          {options.languages.map((language) => (
            <FilterBubble
              key={language}
              label={language}
              value={language}
              selectedValues={selected.languages}
              onPick={(value) => toggleFilter('language', value)}
              className="language"
            />
          ))}
        </div>
      </div>

      <p className="filter-status">{isPending ? 'Updating…' : anyFilterActive ? 'Filters applied' : 'No filters applied'}</p>
    </section>
  );
}
