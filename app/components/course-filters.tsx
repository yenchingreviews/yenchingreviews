'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

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

function trackToken(trackName: string | null) {
  switch (trackName) {
    case 'Economics and Management':
      return 'track-econ';
    case 'General Elective':
      return 'track-general';
    case 'History and Archaeology':
      return 'track-history';
    case 'Law and Society':
      return 'track-law';
    case 'Literature and Culture':
      return 'track-literature';
    case 'Philosophy and Religion':
      return 'track-philosophy';
    case 'Politics and International Relations':
      return 'track-politics';
    default:
      return 'track-default';
  }
}

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
      <div className="panel-header-row">
        <h2 className="panel-title panel-title-filters">Filters</h2>
        <button type="button" className={`clear-filters ${anyFilterActive ? 'is-active' : ''}`} onClick={resetAll}>
          Clear all
        </button>
      </div>

      <div className="filter-group">
        <h3>Yenching or PKU-Wide</h3>
        <div className="filter-row">
          <button
            type="button"
            className={`tag filter-tag all-tag ${selected.categoryTypes.length === 0 ? 'active all-active' : ''}`}
            onClick={() => resetGroup('category_type')}
          >
            All
          </button>
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
        <div className="filter-row">
          <button
            type="button"
            className={`tag filter-tag all-tag track-all ${selected.trackNames.length === 0 ? 'active all-active' : ''}`}
            onClick={() => resetGroup('track_name')}
          >
            All
          </button>
          {options.tracks.map((track) => (
            <FilterBubble
              key={track}
              label={track}
              value={track}
              selectedValues={selected.trackNames}
              onPick={(value) => toggleFilter('track_name', value)}
              className={trackToken(track)}
            />
          ))}
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
