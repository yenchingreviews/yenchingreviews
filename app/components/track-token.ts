export function trackToken(trackName: string | null) {
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
