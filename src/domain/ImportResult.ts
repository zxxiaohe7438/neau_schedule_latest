import type { CourseEventCreateInput } from './CourseEvent';

export interface ImportResult {
  semester: {
    name: string;
    start_date: string;
    weeks_count: number;
  };
  courses: ImportCourseItem[];
  unscheduled_courses: UnscheduledCourse[];
  errors: ImportError[];
  conflicts: ImportConflict[];
  total_count: number;
}

export interface UnscheduledCourse {
  course_name: string;
  course_number: string;
  teacher: string;
  units: number;
  note: string;
}

export interface ImportCourseItem {
  course_name: string;
  teacher: string;
  /** 课程编号（官网抓取等来源；非空时导入后写入 course.course_number） */
  course_number?: string;
  event: CourseEventCreateInput;
  source_hash: string;
  is_duplicate: boolean;
  has_conflict: boolean;
  conflict_resolution?: 'skip' | 'overwrite' | 'keep_local';
  /** 冲突/重复对应的本地事件 id（检测阶段由 checkDuplicatesAndConflicts 填充，覆盖/保留裁决用） */
  existing_event_id?: number;
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
