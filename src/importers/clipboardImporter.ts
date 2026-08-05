/**
 * Clipboard Importer - Parses course data from clipboard text.
 * Supports simple text format with one course per line.
 */

import type { ImportResult, ImportCourseItem, ImportError } from '../domain/ImportResult';
import { WEEKDAY_MAP } from '../utils/weekday';
import {
  parseSectionRange,
  parseWeekRange,
  buildImportItem,
  emptyImportResult,
  type ParsedCourseData,
} from './common';

/**
 * Parse a single line of course text.
 * Expected format: "课程名 教师 地点 星期 节次 周次 [单/双周]"
 * Example: "数据库原理与应用 张老师 成栋楼A101 周一 1-2节 1-16周"
 * Example: "大学英语 李老师 成栋楼B202 周三 3-4节 1-16周 双周"
 */
function parseLine(line: string): ParsedCourseData | null {
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
  const sectionRange = parseSectionRange(afterWeekday);
  if (!sectionRange) return null;

  // Parse week: "1-16周" or "1-16周(单)" or "1-16周(双)" or "1-16周 单周"
  const weekRange = parseWeekRange(afterWeekday);
  if (!weekRange) return null;

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
    startSection: sectionRange.start,
    endSection: sectionRange.end,
    startWeek: weekRange.start,
    endWeek: weekRange.end,
    weekPattern: weekRange.pattern,
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
  const name = semesterName ?? '';

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseLine(line);

    if (parsed) {
      courses.push(buildImportItem(parsed, name));
    } else if (line) {
      errors.push({
        index: i,
        field: 'line',
        message: `无法解析此行: "${line}"`,
        raw_data: line,
      });
    }
  }

  return emptyImportResult(errors, courses, name);
}
