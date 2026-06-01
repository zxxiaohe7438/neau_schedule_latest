/**
 * Types for NEAU Timetable Exporter
 */

export interface SectionTime {
  section: number;
  startTime: string;
  endTime: string;
}

export interface Course {
  courseName: string;
  teacher: string;
  location: string;
  weekday: number; // 1=Monday, 7=Sunday
  startSection: number;
  endSection: number;
  startWeek: number;
  endWeek: number;
  weekPattern: 'all' | 'odd' | 'even';
  note: string;
  rawText: string;
}

export interface Semester {
  name: string;
  startDate: string; // YYYY-MM-DD
  weeksCount: number;
}

export interface TimetableJson {
  version: number;
  school: string;
  source: string;
  semester: Semester;
  sectionTimes: SectionTime[];
  courses: Course[];
}

export interface ParseError {
  index: number;
  field: string;
  message: string;
  rawText?: string;
}

export interface ParseResult {
  success: boolean;
  data?: TimetableJson;
  errors: ParseError[];
}
