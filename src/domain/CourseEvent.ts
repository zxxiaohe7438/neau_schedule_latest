export type WeekPattern = 'all' | 'odd' | 'even';

export interface CourseEvent {
  id: number;
  course_id: number;
  weekday: number;        // 1=Monday, 7=Sunday
  start_section: number;
  end_section: number;
  start_week: number;
  end_week: number;
  week_pattern: WeekPattern;
  location: string;
  note: string;
  source_hash: string;
  updated_manually: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseEventCreateInput {
  course_id: number;
  weekday: number;
  start_section: number;
  end_section: number;
  start_week: number;
  end_week: number;
  week_pattern: WeekPattern;
  location?: string;
  note?: string;
  source_hash?: string;
}

export interface CourseEventUpdateInput {
  weekday?: number;
  start_section?: number;
  end_section?: number;
  start_week?: number;
  end_week?: number;
  week_pattern?: WeekPattern;
  location?: string;
  note?: string;
}
