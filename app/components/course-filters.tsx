'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

type CourseFiltersProps = {
  selected: {
    categoryType: string;
    trackName: string;
    language: string;
  };
  options: {
    categories: string[];
    tracks: string[];
    languages: string[];
  };
};

function trackToken(trackName: string | null) {
  if (!trackName) return 'track-default';

  const palette = [
    'track-amber',
    'track-blue',
    'track-rose',
    'track-violet',
    'track-teal',
    'track-olive',
    'track-orange',
  ];

  const hash = Array.from(trackName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function CourseFilters({ selected, options }: CourseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function pushParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function FilterBubble({
    label,
    selectedValue,
    value,
    className,
    onPick,
  }: {
    label: string;
    selectedValue: string;
    value: string;
    className?: string;
    onPick: (value: string) => void;
  }) {
    const active = selectedValue === value;
    return (
      <button type="button" className={`tag filter-tag ${className ?? ''} ${active ? 'active' : ''}`} onClick={() => onPick(active ? '' : value)}>
        {label}
      </button>
    );
  }

  return (
    <section className="filter-panel">
      <h2 className="panel-title">Filters</h2>

      <div className="filter-group">
        <h3>Yenching or PKU-Wide</h3>
        <div className="filter-row">
          {options.categories.map((category) => (
            <FilterBubble
              key={category}
              label={category}
              value={category}
              selectedValue={selected.categoryType}
              onPick={(value) => pushParam('category_type', value)}
              className={`category ${category === 'Yenching' ? 'is-yenching' : 'is-pku'}`}
            />
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h3>Track</h3>
        <div className="filter-row">
          {options.tracks.map((track) => (
            <FilterBubble
              key={track}
              label={track}
              value={track}
              selectedValue={selected.trackName}
              onPick={(value) => pushParam('track_name', value)}
              className={trackToken(track)}
            />
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h3>Language</h3>
        <div className="filter-row">
          {options.languages.map((language) => (
            <FilterBubble
              key={language}
              label={language}
              value={language}
              selectedValue={selected.language}
              onPick={(value) => pushParam('language', value)}
              className="language"
            />
          ))}
        </div>
      </div>

      <p className="filter-status">{isPending ? 'Updating…' : 'Live filters enabled'}</p>
    </section>
  );
}
