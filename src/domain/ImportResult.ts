import type { CourseEventCreateInput } from './CourseEvent';

export interface ImportResult {
  semester: {
    name: string;
    start_date: string;
    weeks_count: number;
  };
  courses: ImportCourseItem[];
  errors: ImportError[];
  conflicts: ImportConflict[];
  total_count: number;
}

export interface ImportCourseItem {
  course_name: string;
  teacher: string;
  event: CourseEventCreateInput;
  source_hash: string;
  is_duplicate: boolean;
  has_conflict: boolean;
  conflict_resolution?: 'skip' | 'overwrite' | 'keep_local';
}

export interface ImportError {
  index: number;
  field: string;
  message: string;
  raw_data: unknown;
}

export interface ImportConflict {
  course_name: string;
  existing_event_id: number;
  existing_location: string;
  existing_note: string;
  existing_updated_manually: boolean;
  new_location: string;
  new_note: string;
}
