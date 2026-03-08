export type Course = {
  course_id: string;
  course_name: string;
  category_type: 'Yenching' | 'PKU Wide' | string | null;
  track_name: string | null;
  language: string | null;
  aliases: string | null;
  notes: string | null;
};
