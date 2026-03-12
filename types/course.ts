export type Course = {
  course_id: string;
  course_name: string;
  category_type: 'Yenching' | 'PKU Wide' | string | null;
  track_name: string | null;
  language: string | null;
  latest_name_source_term: string | null;
  name_variants: string | null;
  source_terms_present: string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  legacy_course?: boolean | null;
  review_count?: number;
};

export type Review = {
  review_id: string;
  course_id: string;
  course_name: string;
  category_type: string | null;
  track_name: string | null;
  term_label: string | null;
  term_year: number | null;
  term_season: string | null;
  professor_name: string | null;
  review_order_in_term_left_to_right: number | null;
  review_text: string | null;
  reviewer_display_name: string | null;
  is_anonymous: boolean | null;
  legacy_review: boolean | null;
  rating_quality: number | null;
  rating_workload: 'Light' | 'Moderate' | 'Heavy' | string | null;
  used_for_track_credit: boolean | null;
  used_for_track: string | null;
  source_sheet: string | null;
  source_row: number | null;
  source_review_column_index: number | null;
};
