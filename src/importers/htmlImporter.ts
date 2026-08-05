/**
 * HTML Importer - Parses course timetable from HTML files.
 * Supports simple table structure with course info in cells.
 */

import * as cheerio from 'cheerio';
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
 * Parse a single cell content into course info.
 * Expected format: "课程名\n教师\n地点\n周次"
 */
function parseCellContent(
  cellText: string,
  weekday: number,
  sectionStart: number,
  sectionEnd: number
): ParsedCourseData | null {
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
  };
}

/**
 * Import course data from an HTML string.
 * Parses a table structure with days as columns and sections as rows.
 */
export function importHtml(html: string, semesterName?: string): ImportResult {
  const errors: ImportError[] = [];
  const courses: ImportCourseItem[] = [];
  const name = semesterName ?? '';

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
      return emptyImportResult(errors, [], name);
    }

    // Parse header to get weekday mapping
    const headerCells = table.find('thead th');
    const weekdayMap: Record<number, number> = {}; // column index -> weekday number

    headerCells.each((i, el) => {
      const text = $(el).text().trim();
      const weekday = WEEKDAY_MAP[text];
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
          courses.push(buildImportItem(parsed, name));
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

  return emptyImportResult(errors, courses, name);
}
