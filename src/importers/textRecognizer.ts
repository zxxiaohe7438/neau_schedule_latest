/**
 * Text Recognizer - Smart paste parser for schedule information.
 * Recognizes exam schedules, course info, and informal text.
 *
 * Supported formats:
 * 1. Exam format: "6月15日(周一) 14:00-16:00 数据库原理 成栋楼A101"
 * 2. NEAU format: "周一 第1-2节 数据库原理与应用 张老师 成栋楼A101 1-16周"
 * 3. Informal: "下周一上午有数据库考试，在成栋楼A101"
 * 4. Table format: "数据库原理\t周一\t1-2节\t成栋楼A101\t1-16周"
 */

import type { ImportResult, ImportCourseItem, ImportError } from '../domain/ImportResult';
import type { WeekPattern } from '../domain/CourseEvent';
import { computeSourceHash } from './normalizer';
import { WEEKDAY_MAP } from '../utils/weekday';

/** Chinese weekday characters for date-based detection */
const WEEKDAY_CHARS = ['日', '一', '二', '三', '四', '五', '六'];

interface ParsedItem {
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
 * Extract weekday from text.
 * Supports: "周一", "星期一", "Mon", "下周一", "6月15日(周一)", etc.
 */
function extractWeekday(text: string): { weekday: number; index: number; length: number } | null {
  // Try standard weekday patterns first
  const weekdayPattern = Object.keys(WEEKDAY_MAP).join('|');
  const weekdayRegex = new RegExp(`(${weekdayPattern})`);
  const weekdayMatch = text.match(weekdayRegex);
  if (weekdayMatch) {
    return {
      weekday: WEEKDAY_MAP[weekdayMatch[1]],
      index: weekdayMatch.index!,
      length: weekdayMatch[0].length,
    };
  }

  // Try date-based: "6月15日(周一)" or "6月15日（周一）"
  const dateWeekdayMatch = text.match(/\d+月\d+日[（(]周([一二三四五六日])[）)]/);
  if (dateWeekdayMatch) {
    const char = dateWeekdayMatch[1];
    const weekday = WEEKDAY_CHARS.indexOf(char);
    if (weekday > 0) {
      return { weekday, index: dateWeekdayMatch.index!, length: dateWeekdayMatch[0].length };
    }
  }

  // Try "下周一", "下周二", etc.
  const nextWeekMatch = text.match(/下周([一二三四五六日])/);
  if (nextWeekMatch) {
    const char = nextWeekMatch[1];
    const weekday = WEEKDAY_CHARS.indexOf(char);
    if (weekday > 0) {
      return { weekday, index: nextWeekMatch.index!, length: nextWeekMatch[0].length };
    }
  }

  return null;
}

/**
 * Extract time slot from text.
 * Supports: "14:00-16:00", "第1-2节", "1-2节", "上午", "下午", "晚上"
 */
function extractTimeSlot(text: string): { start: number; end: number; index: number; length: number } | null {
  // Try "HH:MM-HH:MM" format
  const timeRangeMatch = text.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  if (timeRangeMatch) {
    const startHour = parseInt(timeRangeMatch[1], 10);
    const startMin = parseInt(timeRangeMatch[2], 10);
    const endHour = parseInt(timeRangeMatch[3], 10);
    const endMin = parseInt(timeRangeMatch[4], 10);

    // Map time to section numbers (approximate)
    const startSection = timeToSection(startHour, startMin);
    const endSection = timeToSection(endHour, endMin);

    if (startSection && endSection) {
      return {
        start: startSection,
        end: endSection,
        index: timeRangeMatch.index!,
        length: timeRangeMatch[0].length,
      };
    }
  }

  // Try "第X-Y节" or "X-Y节" format
  const sectionMatch = text.match(/(?:第)?(\d+)-(\d+)节/);
  if (sectionMatch) {
    return {
      start: parseInt(sectionMatch[1], 10),
      end: parseInt(sectionMatch[2], 10),
      index: sectionMatch.index!,
      length: sectionMatch[0].length,
    };
  }

  // Try single section: "第X节"
  const singleSectionMatch = text.match(/(?:第)?(\d+)节/);
  if (singleSectionMatch) {
    const section = parseInt(singleSectionMatch[1], 10);
    return {
      start: section,
      end: section,
      index: singleSectionMatch.index!,
      length: singleSectionMatch[0].length,
    };
  }

  // Try time-of-day keywords
  const morningMatch = text.match(/上午/);
  if (morningMatch) {
    return { start: 1, end: 4, index: morningMatch.index!, length: morningMatch[0].length };
  }

  const afternoonMatch = text.match(/下午/);
  if (afternoonMatch) {
    return { start: 5, end: 8, index: afternoonMatch.index!, length: afternoonMatch[0].length };
  }

  const eveningMatch = text.match(/晚上/);
  if (eveningMatch) {
    return { start: 9, end: 10, index: eveningMatch.index!, length: eveningMatch[0].length };
  }

  return null;
}

/**
 * Map time (hour:minute) to section number.
 * Based on typical NEAU schedule:
 * 1: 08:10-08:55, 2: 09:00-09:45, 3: 10:05-10:50, 4: 10:55-11:40
 * 5: 13:30-14:15, 6: 14:20-15:05, 7: 15:35-16:20, 8: 16:25-17:10
 * 9: 18:30-19:15, 10: 19:20-20:05
 */
function timeToSection(hour: number, minute: number): number | null {
  const time = hour * 60 + minute;
  if (time >= 490 && time < 540) return 1;   // 08:10-08:55
  if (time >= 540 && time < 590) return 2;   // 09:00-09:45
  if (time >= 605 && time < 655) return 3;   // 10:05-10:50
  if (time >= 655 && time < 700) return 4;   // 10:55-11:40
  if (time >= 810 && time < 860) return 5;   // 13:30-14:15
  if (time >= 860 && time < 910) return 6;   // 14:20-15:05
  if (time >= 935 && time < 985) return 7;   // 15:35-16:20
  if (time >= 985 && time < 1035) return 8;  // 16:25-17:10
  if (time >= 1110 && time < 1160) return 9; // 18:30-19:15
  if (time >= 1160 && time < 1210) return 10; // 19:20-20:05
  return null;
}

/**
 * Extract location from text.
 * Supports patterns like: "成栋楼A101", "研究生楼427", "A101", "在XXX楼"
 */
function extractLocation(text: string): { location: string; index: number; length: number } | null {
  // Try "XX楼XXX" or "XX楼XXX" pattern
  const buildingMatch = text.match(/[一-龥]+楼[A-Za-z0-9]+/);
  if (buildingMatch) {
    return {
      location: buildingMatch[0],
      index: buildingMatch.index!,
      length: buildingMatch[0].length,
    };
  }

  // Try "在XXX" pattern
  const atMatch = text.match(/在\s*([^\s,，。！!?？]+(?:楼|教室|实验室)[^\s,，。！!?？]*)/);
  if (atMatch) {
    return {
      location: atMatch[1],
      index: atMatch.index!,
      length: atMatch[0].length,
    };
  }

  // Try standalone room number like "A101", "B203"
  const roomMatch = text.match(/\b[A-Za-z]\d{3,4}\b/);
  if (roomMatch) {
    return {
      location: roomMatch[0],
      index: roomMatch.index!,
      length: roomMatch[0].length,
    };
  }

  return null;
}

/**
 * Extract week range from text.
 * Supports: "1-16周", "第1-16周", "1-16周(单)", "1-16周 双周"
 */
function extractWeekRange(text: string): {
  startWeek: number;
  endWeek: number;
  weekPattern: WeekPattern;
  index: number;
  length: number;
} | null {
  const weekMatch = text.match(/(?:第)?(\d+)-(\d+)周\s*(?:\((单|双)\)|(单|双)周)?/);
  if (weekMatch) {
    const patternStr = weekMatch[3] || weekMatch[4];
    return {
      startWeek: parseInt(weekMatch[1], 10),
      endWeek: parseInt(weekMatch[2], 10),
      weekPattern: patternStr === '单' ? 'odd' : patternStr === '双' ? 'even' : 'all',
      index: weekMatch.index!,
      length: weekMatch[0].length,
    };
  }

  // Try "第X周" (single week)
  const singleWeekMatch = text.match(/(?:第)?(\d+)周/);
  if (singleWeekMatch) {
    const week = parseInt(singleWeekMatch[1], 10);
    return {
      startWeek: week,
      endWeek: week,
      weekPattern: 'all',
      index: singleWeekMatch.index!,
      length: singleWeekMatch[0].length,
    };
  }

  return null;
}

/**
 * Try to parse a structured line (tab or multi-space separated).
 * Format: "课程名\t周几\t节次\t地点\t周次"
 */
function parseStructuredLine(line: string): ParsedItem | null {
  const parts = line.split(/[\t]+|\s{2,}/).map(p => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;

  let courseName = '';
  let weekday = 0;
  let startSection = 0;
  let endSection = 0;
  let location = '';
  let startWeek = 1;
  let endWeek = 18;
  let weekPattern: WeekPattern = 'all';
  let teacher = '';

  for (const part of parts) {
    // Check for weekday
    const wd = extractWeekday(part);
    if (wd) {
      weekday = wd.weekday;
      continue;
    }

    // Check for time slot
    const ts = extractTimeSlot(part);
    if (ts) {
      startSection = ts.start;
      endSection = ts.end;
      continue;
    }

    // Check for week range
    const wr = extractWeekRange(part);
    if (wr) {
      startWeek = wr.startWeek;
      endWeek = wr.endWeek;
      weekPattern = wr.weekPattern;
      continue;
    }

    // Check for location
    const loc = extractLocation(part);
    if (loc) {
      location = loc.location;
      continue;
    }

    // Check for teacher (contains "老师" or "教授" or ends with common surnames)
    if (part.includes('老师') || part.includes('教授') || part.includes('教师')) {
      teacher = part;
      continue;
    }

    // Otherwise, assume it's part of the course name
    if (!courseName) {
      courseName = part;
    }
  }

  if (!courseName || !weekday) return null;

  // Default sections if not specified
  if (!startSection) {
    startSection = 1;
    endSection = 2;
  }

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
    rawText: line,
  };
}

/**
 * Try to parse an exam-style line.
 * Format: "6月15日(周一) 14:00-16:00 数据库原理 成栋楼A101"
 */
function parseExamLine(line: string): ParsedItem | null {
  const weekday = extractWeekday(line);
  const timeSlot = extractTimeSlot(line);
  const location = extractLocation(line);

  if (!weekday || !timeSlot) return null;

  // Extract course name by removing known patterns
  let courseName = line;
  // Remove date pattern
  courseName = courseName.replace(/\d+月\d+日[（(][^）)]*[）)]/g, '');
  // Remove time pattern
  courseName = courseName.replace(/\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/g, '');
  // Remove location
  if (location) {
    courseName = courseName.replace(location.location, '');
  }
  // Remove weekday
  courseName = courseName.replace(/周[一二三四五六日]/g, '');
  // Remove "考试", "测试" keywords
  courseName = courseName.replace(/[考试测试]+/g, '');
  // Clean up
  courseName = courseName.replace(/[,，。、\s]+/g, ' ').trim();

  if (!courseName) return null;

  // For exams, assume current semester, all weeks (single event)
  return {
    courseName,
    teacher: '',
    location: location?.location ?? '',
    weekday: weekday.weekday,
    startSection: timeSlot.start,
    endSection: timeSlot.end,
    startWeek: 1,
    endWeek: 18,
    weekPattern: 'all',
    rawText: line,
  };
}

/**
 * Try to parse a natural language line.
 * This is a fallback for informal text.
 */
function parseNaturalLanguage(line: string): ParsedItem | null {
  const weekday = extractWeekday(line);
  const timeSlot = extractTimeSlot(line);
  const location = extractLocation(line);

  // Need at least weekday and some other info
  if (!weekday) return null;
  if (!timeSlot && !location) return null;

  // Extract course name by removing known patterns
  let courseName = line;
  if (location) {
    courseName = courseName.replace(location.location, '');
  }
  courseName = courseName.replace(/周[一二三四五六日]/g, '');
  courseName = courseName.replace(/下周/g, '');
  courseName = courseName.replace(/[上午下午晚上]/g, '');
  courseName = courseName.replace(/有/g, '');
  courseName = courseName.replace(/在/g, '');
  courseName = courseName.replace(/考试|测试|课/g, '');
  courseName = courseName.replace(/[,，。、\s]+/g, ' ').trim();

  if (!courseName) return null;

  return {
    courseName,
    teacher: '',
    location: location?.location ?? '',
    weekday: weekday.weekday,
    startSection: timeSlot?.start ?? 1,
    endSection: timeSlot?.end ?? 2,
    startWeek: 1,
    endWeek: 18,
    weekPattern: 'all',
    rawText: line,
  };
}

/**
 * Parse a single line using multiple strategies.
 */
function parseLine(line: string): ParsedItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Try structured format first
  const structured = parseStructuredLine(trimmed);
  if (structured) return structured;

  // Try exam format
  const exam = parseExamLine(trimmed);
  if (exam) return exam;

  // Try natural language
  const natural = parseNaturalLanguage(trimmed);
  if (natural) return natural;

  return null;
}

/**
 * Recognize schedule information from pasted text.
 * Returns an ImportResult with recognized items.
 */
export function recognizeText(text: string, semesterName?: string): ImportResult {
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
        message: `无法识别此行: "${line}"`,
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
