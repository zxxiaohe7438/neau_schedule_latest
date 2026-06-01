import type { Semester } from './Semester';
import type { SectionTime } from './SectionTime';
import type { Course } from './Course';
import type { CourseEvent } from './CourseEvent';

export interface BackupData {
  version: number;
  exported_at: string;
  semester: Semester;
  section_times: SectionTime[];
  courses: Course[];
  course_events: CourseEvent[];
}
