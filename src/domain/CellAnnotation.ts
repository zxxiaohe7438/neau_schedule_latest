export interface CellAnnotation {
  id: number;
  semester_id: number;
  weekday: number;
  section_no: number;
  start_week: number;
  end_week: number;
  week_pattern: 'all' | 'odd' | 'even';
  note: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CellAnnotationCreateInput {
  semester_id: number;
  weekday: number;
  section_no: number;
  start_week: number;
  end_week: number;
  week_pattern: 'all' | 'odd' | 'even';
  note: string;
  color?: string;
}

export interface CellAnnotationUpdateInput {
  note?: string;
  color?: string;
}
