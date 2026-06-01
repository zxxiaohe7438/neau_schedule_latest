/**
 * School Index Importer - Parse NEAU course data from API response.
 * Handles the JSON response from ajaxStudentSchedule/callback.
 */

import type { ImportResult, ImportCourseItem, ImportError } from '../domain/ImportResult';
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
  [key: string]: unknown;
}

interface NeauResponse {
  xkxx: Array<Record<string, NeauCourse>>;
  dateList?: unknown[];
  allUnits?: number;
  [key: string]: unknown;
}

/**
 * Parse classWeek binary string to determine week pattern and range.
 * classWeek is a 24-char string where each char represents a week.
 * '1' = has class, '0' = no class
 */
function parseClassWeek(classWeek: string, weekDescription: string): {
  startWeek: number;
  endWeek: number;
  weekPattern: WeekPattern;
} {
  // Default values
  let startWeek = 1;
  let endWeek = 18;
  let weekPattern: WeekPattern = 'all';

  // Parse weekDescription first (e.g. "1-16周", "1-16周单周", "10-11周")
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

      // Detect odd/even pattern
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
 * Parse a single course from NEAU format to ImportCourseItem.
 */
function parseNeauCourse(
  courseKey: string,
  course: NeauCourse,
  semesterName: string
): { items: ImportCourseItem[]; errors: ImportError[] } {
  const items: ImportCourseItem[] = [];
  const errors: ImportError[] = [];

  const courseName = course.courseName?.trim();
  if (!courseName) {
    errors.push({
      index: -1,
      field: 'courseName',
      message: `课程名为空: ${courseKey}`,
      raw_data: course,
    });
    return { items, errors };
  }

  const teacher = course.attendClassTeacher?.replace(/\*\s*$/, '').trim() ?? '';

  // Parse each time and place entry
  const timeAndPlaceList = course.timeAndPlaceList ?? [];
  if (timeAndPlaceList.length === 0) {
    // Course with no scheduled time (e.g. online courses)
    // Still create an entry but mark it
    errors.push({
      index: -1,
      field: 'timeAndPlaceList',
      message: `课程 "${courseName}" 没有安排上课时间`,
      raw_data: course,
    });
    return { items, errors };
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
 * Supports both raw JSON string and parsed object.
 */
export function importSchoolIndex(
  input: string | NeauResponse,
  semesterName?: string
): ImportResult {
  const allErrors: ImportError[] = [];
  const allCourses: ImportCourseItem[] = [];

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
    // Try to find array with course-like data
    for (const [, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'object' && first !== null) {
          // Check if it looks like course data
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
      errors: allErrors,
      conflicts: [],
      total_count: 0,
    };
  }

  // Extract semester info from dateList or xkxx if available
  let detectedSemesterName = semesterName ?? '';

  // Try to extract from dateList
  if (data.dateList && Array.isArray(data.dateList) && data.dateList.length > 0) {
    const firstDate = data.dateList[0] as Record<string, unknown>;
    if (firstDate && typeof firstDate === 'object') {
      // Check selectCourseList for executiveEducationPlanNumber
      const selectCourseList = firstDate.selectCourseList as Array<Record<string, unknown>>;
      if (selectCourseList && selectCourseList.length > 0) {
        const firstCourse = selectCourseList[0];
        const id = firstCourse.id as Record<string, unknown>;
        if (id && id.executiveEducationPlanNumber) {
          const planNumber = id.executiveEducationPlanNumber as string;
          // Format: "2025-2026-2-1"
          const match = planNumber.match(/(\d{4})-(\d{4})-(\d)/);
          if (match) {
            detectedSemesterName = `${match[1]}-${match[2]}-${match[3]}`;
          }
        }
      }
    }
  }

  // If still no semester name, try to extract from xkxx
  if (!detectedSemesterName && courseData.length > 0) {
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

  // Parse each course
  for (const courseMap of courseData) {
    for (const [, course] of Object.entries(courseMap)) {
      const { items, errors } = parseNeauCourse('', course, detectedSemesterName);
      allCourses.push(...items);
      allErrors.push(...errors);
    }
  }

  return {
    semester: {
      name: detectedSemesterName,
      start_date: '2026-03-02', // Default, can be overridden
      weeks_count: 18,
    },
    courses: allCourses,
    errors: allErrors,
    conflicts: [],
    total_count: allCourses.length,
  };
}
