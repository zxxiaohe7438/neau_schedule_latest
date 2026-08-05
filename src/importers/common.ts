/**
 * 导入器公共工具。
 * 收敛 html/clipboard/xlsx/textRecognizer 四个导入器中重复的
 * 节次/周次解析、ImportCourseItem 构造与空 ImportResult 骨架。
 */
import type { ImportResult, ImportCourseItem, ImportError } from '../domain/ImportResult';
import type { WeekPattern } from '../domain/CourseEvent';
import { computeSourceHash } from './normalizer';

/** 未指定学期时的默认值 */
export const DEFAULT_IMPORT_SEMESTER = { name: '', start_date: '', weeks_count: 18 };

/** 各导入器解析出的统一课程中间结构 */
export interface ParsedCourseData {
  courseName: string;
  teacher: string;
  location: string;
  weekday: number;
  startSection: number;
  endSection: number;
  startWeek: number;
  endWeek: number;
  weekPattern: WeekPattern;
}

/** 解析节次范围文本，如 "1-2节" / "第1-2节" */
export function parseSectionRange(text: string): { start: number; end: number } | null {
  const match = text.match(/(?:第)?(\d+)-(\d+)节/);
  if (match) {
    return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
  }
  return null;
}

/** 解析周次范围文本，如 "1-16周" / "第1-16周(单)" / "1-16周 双周" */
export function parseWeekRange(text: string): { start: number; end: number; pattern: WeekPattern } | null {
  const match = text.match(/(?:第)?(\d+)-(\d+)周\s*(?:\((单|双)\)|(单|双)周)?/);
  if (match) {
    const patternStr = match[3] || match[4];
    return {
      start: parseInt(match[1], 10),
      end: parseInt(match[2], 10),
      pattern: patternStr === '单' ? 'odd' : patternStr === '双' ? 'even' : 'all',
    };
  }
  return null;
}

/** 构造 ImportCourseItem 并计算 source_hash（导入器统一收尾） */
export function buildImportItem(parsed: ParsedCourseData, semesterName: string): ImportCourseItem {
  const sourceHash = computeSourceHash(
    semesterName,
    parsed.courseName,
    parsed.teacher,
    parsed.location,
    parsed.weekday,
    parsed.startSection,
    parsed.endSection,
    parsed.startWeek,
    parsed.endWeek,
    parsed.weekPattern
  );

  return {
    course_name: parsed.courseName,
    teacher: parsed.teacher,
    event: {
      course_id: 0, // Will be set when course is created
      weekday: parsed.weekday,
      start_section: parsed.startSection,
      end_section: parsed.endSection,
      start_week: parsed.startWeek,
      end_week: parsed.endWeek,
      week_pattern: parsed.weekPattern,
      location: parsed.location,
      note: '',
      source_hash: sourceHash,
    },
    source_hash: sourceHash,
    is_duplicate: false,
    has_conflict: false,
  };
}

/** 空 ImportResult 骨架 */
export function emptyImportResult(
  errors: ImportError[],
  courses: ImportCourseItem[] = [],
  semesterName = ''
): ImportResult {
  return {
    semester: { name: semesterName, start_date: '', weeks_count: 18 },
    courses,
    unscheduled_courses: [],
    errors,
    conflicts: [],
    total_count: courses.length,
  };
}
