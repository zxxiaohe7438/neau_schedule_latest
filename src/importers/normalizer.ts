import type { ImportResult, ImportCourseItem, ImportError } from '../domain/ImportResult';
import { isValidWeekPattern } from '../domain/CourseEvent';
import { createHash } from 'crypto';

interface RawJsonInput {
  version?: number;
  school?: string;
  source?: string;
  semester?: {
    name?: string;
    startDate?: string;
    weeksCount?: number;
  };
  sectionTimes?: Array<{
    section?: number;
    startTime?: string;
    endTime?: string;
  }>;
  courses?: Array<{
    courseName?: string;
    teacher?: string;
    location?: string;
    weekday?: number;
    startSection?: number;
    endSection?: number;
    startWeek?: number;
    endWeek?: number;
    weekPattern?: string;
    note?: string;
    rawText?: string;
  }>;
}

/**
 * Compute a deterministic hash for a course event source.
 * Note: note is excluded because it's a user-editable field.
 */
export function computeSourceHash(
  semesterName: string,
  courseName: string,
  teacher: string,
  location: string,
  weekday: number,
  startSection: number,
  endSection: number,
  startWeek: number,
  endWeek: number,
  weekPattern: string
): string {
  const raw = `${semesterName}|${courseName}|${teacher}|${location}|${weekday}|${startSection}-${endSection}|${startWeek}-${endWeek}|${weekPattern}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

/**
 * Normalize and validate a JSON import input.
 * Returns an ImportResult with errors populated for any invalid fields.
 */
export function normalizeJsonImport(input: unknown): ImportResult {
  const data = input as RawJsonInput;
  const errors: ImportError[] = [];
  const courses: ImportCourseItem[] = [];

  // Validate semester
  const semesterName = data.semester?.name ?? '';
  const startDate = data.semester?.startDate ?? '';
  const weeksCount = data.semester?.weeksCount ?? 18;

  if (!semesterName) {
    errors.push({ index: -1, field: 'semester.name', message: '缺少学期名称', raw_data: data.semester });
  }
  if (!startDate) {
    errors.push({ index: -1, field: 'semester.startDate', message: '缺少学期开始日期', raw_data: data.semester });
  }

  // Validate courses
  const rawCourses = data.courses ?? [];
  for (let i = 0; i < rawCourses.length; i++) {
    const c = rawCourses[i];
    const idx = i;

    // courseName required
    if (!c.courseName || typeof c.courseName !== 'string' || !c.courseName.trim()) {
      errors.push({ index: idx, field: 'courseName', message: '课程名不能为空', raw_data: c });
      continue;
    }

    // weekday 1-7
    if (typeof c.weekday !== 'number' || c.weekday < 1 || c.weekday > 7) {
      errors.push({ index: idx, field: 'weekday', message: `weekday 必须是 1-7，当前值: ${c.weekday}`, raw_data: c });
      continue;
    }

    // section range
    const startSection = c.startSection ?? 0;
    const endSection = c.endSection ?? 0;
    if (startSection < 1 || endSection < 1) {
      errors.push({ index: idx, field: 'startSection', message: '节次必须 >= 1', raw_data: c });
      continue;
    }
    if (startSection > endSection) {
      errors.push({
        index: idx,
        field: 'startSection',
        message: `startSection(${startSection}) 不能大于 endSection(${endSection})`,
        raw_data: c,
      });
      continue;
    }

    // week range
    const startWeek = c.startWeek ?? 0;
    const endWeek = c.endWeek ?? 0;
    if (startWeek < 1 || endWeek < 1) {
      errors.push({ index: idx, field: 'startWeek', message: '周次必须 >= 1', raw_data: c });
      continue;
    }
    if (startWeek > endWeek) {
      errors.push({
        index: idx,
        field: 'startWeek',
        message: `startWeek(${startWeek}) 不能大于 endWeek(${endWeek})`,
        raw_data: c,
      });
      continue;
    }

    // weekPattern
    const weekPattern = c.weekPattern ?? 'all';
    if (!isValidWeekPattern(weekPattern)) {
      errors.push({
        index: idx,
        field: 'weekPattern',
        message: `weekPattern 必须是 all/odd/even，当前值: ${weekPattern}`,
        raw_data: c,
      });
      continue;
    }

    // All valid — compute hash and add
    const sourceHash = computeSourceHash(
      semesterName,
      c.courseName,
      c.teacher ?? '',
      c.location ?? '',
      c.weekday,
      startSection,
      endSection,
      startWeek,
      endWeek,
      weekPattern
    );

    courses.push({
      course_name: c.courseName.trim(),
      teacher: c.teacher?.trim() ?? '',
      event: {
        course_id: 0, // Will be set when course is created
        weekday: c.weekday,
        start_section: startSection,
        end_section: endSection,
        start_week: startWeek,
        end_week: endWeek,
        week_pattern: weekPattern,
        location: c.location?.trim() ?? '',
        note: c.note?.trim() ?? '',
        source_hash: sourceHash,
      },
      source_hash: sourceHash,
      is_duplicate: false,
      has_conflict: false,
    });
  }

  return {
    semester: {
      name: semesterName,
      start_date: startDate,
      weeks_count: weeksCount,
    },
    courses,
    unscheduled_courses: [],
    errors,
    conflicts: [],
    total_count: courses.length,
  };
}
