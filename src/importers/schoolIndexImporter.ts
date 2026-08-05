/**
 * School Index Importer - Parse NEAU course data from API response.
 * Handles the JSON response from ajaxStudentSchedule/callback.
 */

import type { ImportResult, ImportCourseItem, ImportError, UnscheduledCourse } from '../domain/ImportResult';
import type { WeekPattern } from '../domain/CourseEvent';
import { computeSourceHash } from './normalizer';

interface NeauTimeAndPlace {
  classDay: number;        // 1-7 (Monday-Sunday)，空值时无固定时间
  classSessions: number;   // Start section
  continuingSession: number; // Duration in sections
  classroomName: string;   // Room name
  teachingBuildingName: string; // Building name
  campusName?: string;     // Campus name（页面展示时拼接在楼名前）
  weekDescription: string; // e.g. "1-16周", "1-16周单周"
  classWeek: string;       // 24-char binary string, '1' = has class that week
}

interface NeauCourse {
  courseName: string;
  attendClassTeacher: string;
  timeAndPlaceList: NeauTimeAndPlace[];
  skzcs?: string; // e.g. "1-16周", "1-8周"
  id?: {
    coureNumber?: string;  // 课程号
    [key: string]: unknown;
  };
  unit?: number;  // 学分
  [key: string]: unknown;
}

interface NeauResponse {
  xkxx: Array<Record<string, NeauCourse>>;
  dateList?: unknown[];
  allUnits?: number;
  jcsjbs?: Array<{ jc: string; kssj: string; jssj: string }>;
  [key: string]: unknown;
}

/**
 * Parse classWeek binary string to determine week pattern and range.
 */
function parseClassWeek(classWeek: string, weekDescription: string): {
  startWeek: number;
  endWeek: number;
  weekPattern: WeekPattern;
} {
  let startWeek = 1;
  let endWeek = 18;
  let weekPattern: WeekPattern = 'all';

  // Parse weekDescription first
  const weekDescMatch = weekDescription.match(/(\d+)-(\d+)周(?:\s*(单|双))?/);
  if (weekDescMatch) {
    startWeek = parseInt(weekDescMatch[1], 10);
    endWeek = parseInt(weekDescMatch[2], 10);
    if (weekDescMatch[3] === '单') {
      weekPattern = 'odd';
    } else if (weekDescMatch[3] === '双') {
      weekPattern = 'even';
    }
  }

  // If classWeek is available, use it to verify
  if (classWeek && classWeek.length >= 16) {
    const weeks = classWeek.split('').map(c => c === '1');
    const activeWeeks: number[] = [];
    weeks.forEach((active, i) => {
      if (active) activeWeeks.push(i + 1);
    });

    if (activeWeeks.length > 0) {
      startWeek = activeWeeks[0];
      endWeek = activeWeeks[activeWeeks.length - 1];

      const isAllOdd = activeWeeks.every(w => w % 2 === 1);
      const isAllEven = activeWeeks.every(w => w % 2 === 0);

      if (isAllOdd) {
        weekPattern = 'odd';
      } else if (isAllEven) {
        weekPattern = 'even';
      } else {
        weekPattern = 'all';
      }
    }
  }

  return { startWeek, endWeek, weekPattern };
}

/**
 * Parse skzcs string to get week range.
 * e.g. "1-16周", "1-8周", "1-16周;13-16周", "第1周"
 */
function parseSkzcs(skzcs: string): { startWeek: number; endWeek: number } {
  const matches = skzcs.match(/(\d+)(?:-(\d+))?周/g);
  if (!matches) return { startWeek: 1, endWeek: 18 };

  let minWeek = Infinity;
  let maxWeek = 0;
  for (const match of matches) {
    const nums = match.match(/(\d+)(?:-(\d+))?/);
    if (nums) {
      const start = parseInt(nums[1], 10);
      const end = nums[2] ? parseInt(nums[2], 10) : start;
      minWeek = Math.min(minWeek, start);
      maxWeek = Math.max(maxWeek, end);
    }
  }

  return {
    startWeek: minWeek === Infinity ? 1 : minWeek,
    endWeek: maxWeek === 0 ? 18 : maxWeek,
  };
}

/**
 * 计算某年某月的第一个星期一（开学日期默认值用）。
 */
function firstMondayOfMonth(year: number, month: number): string {
  const first = new Date(year, month - 1, 1);
  const dayOfWeek = first.getDay(); // 0 = Sunday
  const offset = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(year, month - 1, 1 + offset);
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${monday.getFullYear()}-${mm}-${dd}`;
}

/**
 * Calculate semester start date (default guess, user can confirm in UI).
 * Assume semester starts on the first Monday: term 1 = September of the first
 * year, term 2 = March of the second year.
 * e.g. "2025-2026-1" -> first Monday of 2025-09 (2025-09-01),
 *      "2025-2026-2" -> first Monday of 2026-03 (2026-03-02).
 */
function calculateSemesterStartDate(semesterName: string): string {
  const match = semesterName.match(/(\d{4})-(\d{4})-(\d)/);
  if (!match) return '';
  const year1 = parseInt(match[1], 10);
  const year2 = parseInt(match[2], 10);
  const term = parseInt(match[3], 10);
  if (term === 1) return firstMondayOfMonth(year1, 9);
  if (term === 2) return firstMondayOfMonth(year2, 3);
  return '';
}

/**
 * Parse a single course from NEAU format.
 */
function parseNeauCourse(
  course: NeauCourse,
  semesterName: string
): { items: ImportCourseItem[]; unscheduled?: UnscheduledCourse; errors: ImportError[] } {
  const items: ImportCourseItem[] = [];
  const errors: ImportError[] = [];

  const courseName = course.courseName?.trim();
  if (!courseName) {
    return { items, errors };
  }

  const teacher = course.attendClassTeacher?.replace(/\*\s*$/, '').trim() ?? '';
  const courseNumber = course.id?.coureNumber ?? '';
  const units = course.unit ?? 0;

  // Parse each time and place entry
  const timeAndPlaceList = course.timeAndPlaceList ?? [];
  if (timeAndPlaceList.length === 0) {
    // No scheduled time - return as unscheduled course
    return {
      items,
      unscheduled: {
        course_name: courseName,
        course_number: courseNumber,
        teacher,
        units,
        note: '',
      },
      errors,
    };
  }

  for (const tap of timeAndPlaceList) {
    const weekday = tap.classDay;
    // 无有效星期（空值/越界）→ 该条目无固定时间，按无日程课程处理
    if (typeof weekday !== 'number' || weekday < 1 || weekday > 7) {
      continue;
    }
    const startSection = tap.classSessions;
    const endSection = tap.classSessions + tap.continuingSession - 1;
    // 地点只拼楼名+教室号：校区名（如"本校区"）对单校区学校无意义，不展示
    const location = [tap.teachingBuildingName, tap.classroomName]
      .filter(Boolean)
      .join('');

    const { startWeek, endWeek, weekPattern } = parseClassWeek(
      tap.classWeek ?? '',
      tap.weekDescription ?? ''
    );

    const sourceHash = computeSourceHash(
      semesterName,
      courseName,
      teacher,
      location,
      weekday,
      startSection,
      endSection,
      startWeek,
      endWeek,
      weekPattern
    );

    items.push({
      course_name: courseName,
      teacher,
      course_number: courseNumber,
      event: {
        course_id: 0,
        weekday,
        start_section: startSection,
        end_section: endSection,
        start_week: startWeek,
        end_week: endWeek,
        week_pattern: weekPattern,
        location,
        note: '',
        source_hash: sourceHash,
      },
      source_hash: sourceHash,
      is_duplicate: false,
      has_conflict: false,
    });
  }

  // 有 timeAndPlaceList 但所有条目都无有效星期 → 视为无日程课程
  if (items.length === 0) {
    return {
      items,
      unscheduled: {
        course_name: courseName,
        course_number: courseNumber,
        teacher,
        units,
        note: '',
      },
      errors,
    };
  }

  return { items, errors };
}

/**
 * Import course data from NEAU API response.
 */
export function importSchoolIndex(
  input: string | NeauResponse,
  semesterName?: string
): ImportResult {
  const allErrors: ImportError[] = [];
  const allCourses: ImportCourseItem[] = [];
  const allUnscheduled: UnscheduledCourse[] = [];

  let data: NeauResponse;
  try {
    if (typeof input === 'string') {
      data = JSON.parse(input);
    } else {
      data = input;
    }
  } catch (err) {
    allErrors.push({
      index: -1,
      field: 'json',
      message: `JSON 解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      raw_data: null,
    });
    return {
      semester: { name: semesterName ?? '', start_date: '', weeks_count: 18 },
      courses: [],
      unscheduled_courses: [],
      errors: allErrors,
      conflicts: [],
      total_count: 0,
    };
  }

  // Find course data in response
  let courseData: Array<Record<string, NeauCourse>> = [];

  if (Array.isArray(data.xkxx)) {
    courseData = data.xkxx;
  } else {
    for (const [, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'object' && first !== null) {
          const values = Object.values(first);
          if (values.length > 0 && typeof values[0] === 'object' && values[0] !== null) {
            const firstCourse = values[0] as Record<string, unknown>;
            if ('courseName' in firstCourse || 'timeAndPlaceList' in firstCourse) {
              courseData = value as Array<Record<string, NeauCourse>>;
              break;
            }
          }
        }
      }
    }
  }

  if (courseData.length === 0) {
    allErrors.push({
      index: -1,
      field: 'xkxx',
      message: '未找到课程数据 (xkxx 字段)',
      raw_data: data,
    });
    return {
      semester: { name: semesterName ?? '', start_date: '', weeks_count: 18 },
      courses: [],
      unscheduled_courses: [],
      errors: allErrors,
      conflicts: [],
      total_count: 0,
    };
  }

  // Detect semester name
  let detectedSemesterName = semesterName ?? '';

  // Try to extract from xkxx
  if (!detectedSemesterName) {
    for (const courseMap of courseData) {
      for (const course of Object.values(courseMap)) {
        const id = (course as Record<string, unknown>).id as Record<string, unknown>;
        if (id && id.executiveEducationPlanNumber) {
          const planNumber = id.executiveEducationPlanNumber as string;
          const match = planNumber.match(/(\d{4})-(\d{4})-(\d)/);
          if (match) {
            detectedSemesterName = `${match[1]}-${match[2]}-${match[3]}`;
            break;
          }
        }
      }
      if (detectedSemesterName) break;
    }
  }

  // Calculate max week from all courses
  let maxWeek = 0;
  for (const courseMap of courseData) {
    for (const course of Object.values(courseMap)) {
      const skzcs = course.skzcs ?? '';
      const { endWeek } = parseSkzcs(skzcs);
      maxWeek = Math.max(maxWeek, endWeek);

      // Also check timeAndPlaceList
      for (const tap of course.timeAndPlaceList ?? []) {
        const { endWeek: tapEndWeek } = parseClassWeek(tap.classWeek ?? '', tap.weekDescription ?? '');
        maxWeek = Math.max(maxWeek, tapEndWeek);
      }
    }
  }

  // Parse each course
  for (const courseMap of courseData) {
    for (const course of Object.values(courseMap)) {
      const { items, unscheduled, errors } = parseNeauCourse(course, detectedSemesterName);
      allCourses.push(...items);
      allErrors.push(...errors);
      if (unscheduled) {
        allUnscheduled.push(unscheduled);
      }
    }
  }

  return {
    semester: {
      name: detectedSemesterName,
      start_date: calculateSemesterStartDate(detectedSemesterName),
      weeks_count: maxWeek > 0 ? maxWeek : 18,
    },
    courses: allCourses,
    unscheduled_courses: allUnscheduled,
    errors: allErrors,
    conflicts: [],
    total_count: allCourses.length,
  };
}
