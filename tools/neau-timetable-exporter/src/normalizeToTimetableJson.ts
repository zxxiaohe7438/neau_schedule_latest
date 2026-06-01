/**
 * Normalize extracted course data to timetable.json format.
 */

import type { Course, TimetableJson, ParseResult, SectionTime } from './types';

/** Default NEAU section times */
const DEFAULT_SECTION_TIMES: SectionTime[] = [
  { section: 1, startTime: '08:00', endTime: '08:45' },
  { section: 2, startTime: '08:55', endTime: '09:40' },
  { section: 3, startTime: '10:00', endTime: '10:45' },
  { section: 4, startTime: '10:55', endTime: '11:40' },
  { section: 5, startTime: '14:00', endTime: '14:45' },
  { section: 6, startTime: '14:55', endTime: '15:40' },
  { section: 7, startTime: '16:00', endTime: '16:45' },
  { section: 8, startTime: '16:55', endTime: '17:40' },
  { section: 9, startTime: '19:00', endTime: '19:45' },
  { section: 10, startTime: '19:55', endTime: '20:40' },
  { section: 11, startTime: '20:50', endTime: '21:35' },
];

/**
 * Parse semester info from HTML or use defaults.
 */
function parseSemesterInfo(html: string): { name: string; startDate: string; weeksCount: number } {
  // Try to extract from HTML
  const nameMatch = html.match(/学期[：:]\s*(\d{4}-\d{4}-\d)/);
  const dateMatch = html.match(/开始日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
  const weeksMatch = html.match(/总周数[：:]\s*(\d+)/);

  return {
    name: nameMatch?.[1] ?? '2025-2026-2',
    startDate: dateMatch?.[1] ?? '2026-03-02',
    weeksCount: weeksMatch ? parseInt(weeksMatch[1], 10) : 18,
  };
}

/**
 * Convert extracted courses to timetable.json format.
 */
export function normalizeToTimetableJson(
  courses: Course[],
  html?: string
): ParseResult {
  if (courses.length === 0) {
    return {
      success: false,
      errors: [{ index: -1, field: 'courses', message: '没有找到任何课程' }],
    };
  }

  const semester = html ? parseSemesterInfo(html) : {
    name: '2025-2026-2',
    startDate: '2026-03-02',
    weeksCount: 18,
  };

  const timetableJson: TimetableJson = {
    version: 1,
    school: '东北农业大学',
    source: 'neau-student-system',
    semester,
    sectionTimes: DEFAULT_SECTION_TIMES,
    courses,
  };

  return {
    success: true,
    data: timetableJson,
    errors: [],
  };
}
