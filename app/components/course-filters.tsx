type CourseFiltersProps = {
  selected: {
    search: string;
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

export function CourseFilters({ selected, options }: CourseFiltersProps) {
  return (
    <form className="filters panel" method="GET">
      <label>
        search
        <input name="search" placeholder="course name or alias" defaultValue={selected.search} />
      </label>

      <label>
        category
        <select name="category_type" defaultValue={selected.categoryType}>
          <option value="">all</option>
          {options.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label>
        track
        <select name="track_name" defaultValue={selected.trackName}>
          <option value="">all</option>
          {options.tracks.map((track) => (
            <option key={track} value={track}>
              {track}
            </option>
          ))}
        </select>
      </label>

      <label>
        language
        <select name="language" defaultValue={selected.language}>
          <option value="">all</option>
          {options.languages.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
      </label>

      <button type="submit">apply filters</button>
    </form>
  );
}
