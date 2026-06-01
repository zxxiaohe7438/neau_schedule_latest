/**
 * Extract course data from NEAU timetable HTML page.
 */

import * as cheerio from 'cheerio';
import type { Course, ParseError } from './types';

/**
 * Parse section range from text like "第1-2节" or "1-2节"
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
function parseWeekRange(text: string): { start: number; end: number; pattern: 'all' | 'odd' | 'even' } | null {
  const match = text.match(/(\d+)-(\d+)周(?:\((单|双)\))?/);
  if (match) {
    const pattern = match[3] === '单' ? 'odd' as const : match[3] === '双' ? 'even' as const : 'all' as const;
    return { start: parseInt(match[1], 10), end: parseInt(match[2], 10), pattern };
  }
  return null;
}

/**
 * Extract courses from HTML string.
 */
export function extractFromHtml(html: string): { courses: Course[]; errors: ParseError[] } {
  const courses: Course[] = [];
  const errors: ParseError[] = [];

  try {
    const $ = cheerio.load(html);
    const table = $('table').first();

    if (table.length === 0) {
      errors.push({
        index: -1,
        field: 'html',
        message: '未找到表格元素',
        rawText: html.substring(0, 200),
      });
      return { courses, errors };
    }

    // Parse header to get weekday mapping
    const headerCells = table.find('thead th');
    const weekdayMap: Record<number, number> = {};

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

        // Extract course info from cell
        const courseName = $(cell).find('.course-name').text().trim() ||
          $(cell).find('div').first().text().trim().split('\n')[0].trim();

        if (!courseName) return;

        const teacher = $(cell).find('.course-teacher').text().trim() || '';
        const location = $(cell).find('.course-location').text().trim() || '';
        const weekText = $(cell).find('.course-week').text().trim() || '';

        const weekInfo = parseWeekRange(weekText);
        if (!weekInfo) {
          errors.push({
            index: courses.length,
            field: 'week',
            message: `无法解析周次: "${weekText}"`,
            rawText: weekText,
          });
          return;
        }

        const rawText = `${courseName} ${teacher} ${location} 周${weekday} ${sectionRange.start}-${sectionRange.end}节 ${weekInfo.start}-${weekInfo.end}周${weekInfo.pattern !== 'all' ? (weekInfo.pattern === 'odd' ? '(单)' : '(双)') : ''}`;

        courses.push({
          courseName,
          teacher,
          location,
          weekday,
          startSection: sectionRange.start,
          endSection: sectionRange.end,
          startWeek: weekInfo.start,
          endWeek: weekInfo.end,
          weekPattern: weekInfo.pattern,
          note: '',
          rawText,
        });
      });
    });
  } catch (err) {
    errors.push({
      index: -1,
      field: 'html',
      message: `HTML 解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      rawText: html.substring(0, 200),
    });
  }

  return { courses, errors };
}
