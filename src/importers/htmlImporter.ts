/**
 * HTML Importer - Parses course timetable from HTML files.
 * Supports simple table structure with course info in cells.
 */

import * as cheerio from 'cheerio';
import type { ImportResult, ImportCourseItem, ImportError } from '../domain/ImportResult';
import type { WeekPattern } from '../domain/CourseEvent';
import { computeSourceHash } from './normalizer';

interface ParsedCourse {
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
 * Parse section range from text like "1-2节" or "3-4节"
 */
function parseSectionRange(text: string): { start: number; end: number } | null {
  const match = text.match(/(\d+)-(\d+)节/);
  if (match) {
    return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
  }
  return null;
}

/**
 * Parse week range from text like "1-16周" or "1-16周(单)" or "1-16周(双)"
 */
function parseWeekRange(text: string): { start: number; end: number; pattern: WeekPattern } | null {
  const match = text.match(/(\d+)-(\d+)周(?:\((单|双)\))?/);
  if (match) {
    const pattern: WeekPattern = match[3] === '单' ? 'odd' : match[3] === '双' ? 'even' : 'all';
    return { start: parseInt(match[1], 10), end: parseInt(match[2], 10), pattern };
  }
  return null;
}

/**
 * Parse a single cell content into course info.
 * Expected format: "课程名\n教师\n地点\n周次"
 */
function parseCellContent(cellText: string, weekday: number, sectionStart: number, sectionEnd: number): ParsedCourse | null {
  const lines = cellText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 4) return null;

  const courseName = lines[0];
  const teacher = lines[1];
  const location = lines[2];
  const weekText = lines[3];

  const weekInfo = parseWeekRange(weekText);
  if (!weekInfo) return null;

  return {
    courseName,
    teacher,
    location,
    weekday,
    startSection: sectionStart,
    endSection: sectionEnd,
    startWeek: weekInfo.start,
    endWeek: weekInfo.end,
    weekPattern: weekInfo.pattern,
    rawText: cellText,
  };
}

/**
 * Import course data from an HTML string.
 * Parses a table structure with days as columns and sections as rows.
 */
export function importHtml(html: string, semesterName?: string): ImportResult {
  const errors: ImportError[] = [];
  const courses: ImportCourseItem[] = [];

  try {
    const $ = cheerio.load(html);
    const table = $('table').first();

    if (table.length === 0) {
      errors.push({
        index: -1,
        field: 'html',
        message: '未找到表格元素',
        raw_data: html.substring(0, 200),
      });
      return {
        semester: { name: semesterName ?? '', start_date: '', weeks_count: 18 },
        courses: [],
        unscheduled_courses: [],
        errors,
        conflicts: [],
        total_count: 0,
      };
    }

    // Parse header to get weekday mapping
    const headerCells = table.find('thead th');
    const weekdayMap: Record<number, number> = {}; // column index -> weekday number

    headerCells.each((i, el) => {
      const text = $(el).text().trim();
      const weekdayNames: Record<string, number> = {
        '周一': 1, '周二': 2, '周三': 3, '周四': 4,
        '周五': 5, '周六': 6, '周日': 7,
      };
      const weekday = weekdayNames[text];
      if (weekday) {
        weekdayMap[i] = weekday;
      }
    });

    // Parse rows
    const rows = table.find('tbody tr');
    rows.each((_rowIdx, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      // First cell is section range
      const sectionText = $(cells[0]).text().trim();
      const sectionRange = parseSectionRange(sectionText);
      if (!sectionRange) return;

      // Parse each weekday cell
      cells.each((i, cell) => {
        if (i === 0) return; // Skip section label cell

        const weekday = weekdayMap[i];
        if (!weekday) return;

        const cellHtml = $(cell).html();
        if (!cellHtml || cellHtml.trim() === '') return;

        // Convert <br> to newlines for parsing
        const cellText = cellHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
        const parsed = parseCellContent(cellText, weekday, sectionRange.start, sectionRange.end);

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
        }
      });
    });
  } catch (err) {
    errors.push({
      index: -1,
      field: 'html',
      message: `HTML 解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      raw_data: html.substring(0, 200),
    });
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
