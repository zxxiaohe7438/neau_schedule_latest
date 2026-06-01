/**
 * School Index Importer - Parse NEAU course data from API response.
 * Handles the JSON response from ajaxStudentSchedule/callback.
 */

import type { ImportResult, ImportCourseItem, ImportError, UnscheduledCourse } from '../domain/ImportResult';
import type { WeekPattern } from '../domain/CourseEvent';
import { computeSourceHash } from './normalizer';

interface NeauTimeAndPlace {
  classDay: number;        // 1-7 (Monday-Sunday)
  classSessions: number;   // Start section
  continuingSession: number; // Duration in sections
  classroomName: string;   // Room name
  teachingBuildingName: string; // Building name
  weekDescription: string; // e.g. "1-16周", "1-16周单周"
  classWeek: string;       // 24-char binary string, '1' = has class that week
}

interface NeauCourse {
  courseName: string;
  attendClassTeacher: string;
  timeAndPlaceList: NeauTimeAndPlace[];
  skzcs?: string; // e.g. "1-16周", "1-8周"
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
 * e.g. "1-16周", "1-8周", "1-16周;13-16周"
 */
function parseSkzcs(skzcs: string): { startWeek: number; endWeek: number } {
  const matches = skzcs.match(/(\d+)-(\d+)周/g);
  if (!matches) return { startWeek: 1, endWeek: 18 };

  let minWeek = Infinity;
  let maxWeek = 0;
  for (const match of matches) {
    const nums = match.match(/(\d+)-(\d+)/);
    if (nums) {
      minWeek = Math.min(minWeek, parseInt(nums[1], 10));
      maxWeek = Math.max(maxWeek, parseInt(nums[2], 10));
    }
  }

  return {
    startWeek: minWeek === Infinity ? 1 : minWeek,
    endWeek: maxWeek === 0 ? 18 : maxWeek,
  };
}

/**
 * Calculate semester start date.
 * Assume semester starts on a Monday, 2026-03-02 is the Monday of week 1 for 2025-2026-2.
 */
function calculateSemesterStartDate(semesterName: string): string {
  // Default for 2025-2026-2
  if (semesterName.includes('2025-2026-2')) {
    return '2026-03-02';
  }
  // Default for 2025-2026-1
  if (semesterName.includes('2025-2026-1')) {
    return '2025-09-01';
  }
  // Default fallback
  return '2026-03-02';
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

  // Parse each time and place entry
  const timeAndPlaceList = course.timeAndPlaceList ?? [];
  if (timeAndPlaceList.length === 0) {
    // No scheduled time - return as unscheduled course
    return {
      items,
      unscheduled: {
        course_name: courseName,
        teacher,
        note: '',
      },
      errors,
    };
  }

  for (const tap of timeAndPlaceList) {
    const weekday = tap.classDay;
    const startSection = tap.classSessions;
    const endSection = tap.classSessions + tap.continuingSession - 1;
    const location = [tap.teachingBuildingName, tap.classroomName].filter(Boolean).join('');

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
