export type Review = {
  review_id?: string;
  id?: string;
  course_id: string;
  review_text?: string | null;
  content?: string | null;
  term?: string | null;
  professor?: string | null;
  rating?: number | null;
  created_at?: string | null;
};
