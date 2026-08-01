/**
 * Clipboard Importer - Parses course data from clipboard text.
 * Supports simple text format with one course per line.
 */

import type { ImportResult, ImportCourseItem, ImportError } from '../domain/ImportResult';
import type { WeekPattern } from '../domain/CourseEvent';
import { computeSourceHash } from './normalizer';
import { WEEKDAY_MAP } from '../utils/weekday';

interface ParsedLine {
  courseName: string;
  teacher: string;
  location: string;
  weekday: number;
  startSection: number;
  endSection: number;
  startWeek: number;
  endWeek: number;
  weekPattern: WeekPattern;
  rawText: string;
}

/**
 * Parse a single line of course text.
 * Expected format: "课程名 教师 地点 星期 节次 周次 [单/双周]"
 * Example: "数据库原理与应用 张老师 成栋楼A101 周一 1-2节 1-16周"
 * Example: "大学英语 李老师 成栋楼B202 周三 3-4节 1-16周 双周"
 */
function parseLine(line: string): ParsedLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Try to match weekday pattern
  const weekdayPattern = Object.keys(WEEKDAY_MAP).join('|');
  const weekdayRegex = new RegExp(`(${weekdayPattern})`);
  const weekdayMatch = trimmed.match(weekdayRegex);

  if (!weekdayMatch) return null;

  const weekday = WEEKDAY_MAP[weekdayMatch[1]];
  const weekdayIndex = weekdayMatch.index!;

  // Split into before and after weekday
  const beforeWeekday = trimmed.substring(0, weekdayIndex).trim();
  const afterWeekday = trimmed.substring(weekdayIndex + weekdayMatch[0].length).trim();

  // Parse section: "1-2节"
  const sectionMatch = afterWeekday.match(/(\d+)-(\d+)节/);
  if (!sectionMatch) return null;

  const startSection = parseInt(sectionMatch[1], 10);
  const endSection = parseInt(sectionMatch[2], 10);

  // Parse week: "1-16周" or "1-16周(单)" or "1-16周(双)" or "1-16周 单周"
  const weekMatch = afterWeekday.match(/(\d+)-(\d+)周\s*(?:\((单|双)\)|(单|双)周)?/);
  if (!weekMatch) return null;

  const startWeek = parseInt(weekMatch[1], 10);
  const endWeek = parseInt(weekMatch[2], 10);
  const patternStr = weekMatch[3] || weekMatch[4];
  const weekPattern: WeekPattern = patternStr === '单' ? 'odd' : patternStr === '双' ? 'even' : 'all';

  // Parse course name, teacher, location from beforeWeekday
  // Format: "课程名 教师 地点" - split by spaces, but course name might contain spaces
  const parts = beforeWeekday.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;

  // Assume last two parts are teacher and location
  const location = parts[parts.length - 1];
  const teacher = parts[parts.length - 2];
  const courseName = parts.slice(0, -2).join(' ');

  return {
    courseName,
    teacher,
    location,
    weekday,
    startSection,
    endSection,
    startWeek,
    endWeek,
    weekPattern,
    rawText: trimmed,
  };
}

/**
 * Import course data from clipboard text.
 * Each line should contain one course in format:
 * "课程名 教师 地点 星期 节次 周次 [单/双周]"
 */
export function importClipboard(text: string, semesterName?: string): ImportResult {
  const errors: ImportError[] = [];
  const courses: ImportCourseItem[] = [];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseLine(line);

    if (parsed) {
      const sourceHash = computeSourceHash(
        semesterName ?? '',
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

      courses.push({
        course_name: parsed.courseName,
        teacher: parsed.teacher,
        event: {
          course_id: 0,
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
      });
    } else if (line) {
      errors.push({
        index: i,
        field: 'line',
        message: `无法解析此行: "${line}"`,
        raw_data: line,
      });
    }
  }

  return {
    semester: { name: semesterName ?? '', start_date: '', weeks_count: 18 },
    courses,
    unscheduled_courses: [],
    errors,
    conflicts: [],
    total_count: courses.length,
  };
}
