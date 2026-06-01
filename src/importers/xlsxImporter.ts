/**
 * Excel/CSV Importer - Parses course data from Excel or CSV files.
 * Uses the xlsx library for parsing.
 */

import * as XLSX from 'xlsx';
import type { ImportResult, ImportCourseItem, ImportError } from '../domain/ImportResult';
import type { WeekPattern } from '../domain/CourseEvent';
import { computeSourceHash } from './normalizer';

interface CsvRow {
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
}

const VALID_WEEK_PATTERNS: ReadonlySet<string> = new Set(['all', 'odd', 'even']);

function isValidWeekPattern(v: unknown): v is WeekPattern {
  return typeof v === 'string' && VALID_WEEK_PATTERNS.has(v);
}

function parseRow(row: CsvRow, index: number, semesterName: string): { item?: ImportCourseItem; error?: ImportError } {
  // courseName required
  if (!row.courseName || typeof row.courseName !== 'string' || !row.courseName.trim()) {
    return {
      error: {
        index,
        field: 'courseName',
        message: '课程名不能为空',
        raw_data: row,
      },
    };
  }

  // weekday 1-7
  const weekday = Number(row.weekday);
  if (typeof weekday !== 'number' || weekday < 1 || weekday > 7) {
    return {
      error: {
        index,
        field: 'weekday',
        message: `weekday 必须是 1-7，当前值: ${row.weekday}`,
        raw_data: row,
      },
    };
  }

  // section range
  const startSection = Number(row.startSection) || 0;
  const endSection = Number(row.endSection) || 0;
  if (startSection < 1 || endSection < 1) {
    return {
      error: {
        index,
        field: 'startSection',
        message: '节次必须 >= 1',
        raw_data: row,
      },
    };
  }
  if (startSection > endSection) {
    return {
      error: {
        index,
        field: 'startSection',
        message: `startSection(${startSection}) 不能大于 endSection(${endSection})`,
        raw_data: row,
      },
    };
  }

  // week range
  const startWeek = Number(row.startWeek) || 0;
  const endWeek = Number(row.endWeek) || 0;
  if (startWeek < 1 || endWeek < 1) {
    return {
      error: {
        index,
        field: 'startWeek',
        message: '周次必须 >= 1',
        raw_data: row,
      },
    };
  }
  if (startWeek > endWeek) {
    return {
      error: {
        index,
        field: 'startWeek',
        message: `startWeek(${startWeek}) 不能大于 endWeek(${endWeek})`,
        raw_data: row,
      },
    };
  }

  // weekPattern
  const weekPattern = row.weekPattern ?? 'all';
  if (!isValidWeekPattern(weekPattern)) {
    return {
      error: {
        index,
        field: 'weekPattern',
        message: `weekPattern 必须是 all/odd/even，当前值: ${weekPattern}`,
        raw_data: row,
      },
    };
  }

  // All valid — compute hash and add
  const sourceHash = computeSourceHash(
    semesterName,
    row.courseName.trim(),
    row.teacher?.trim() ?? '',
    row.location?.trim() ?? '',
    weekday,
    startSection,
    endSection,
    startWeek,
    endWeek,
    weekPattern
  );

  return {
    item: {
      course_name: row.courseName.trim(),
      teacher: row.teacher?.trim() ?? '',
      event: {
        course_id: 0, // Will be set when course is created
        weekday,
        start_section: startSection,
        end_section: endSection,
        start_week: startWeek,
        end_week: endWeek,
        week_pattern: weekPattern,
        location: row.location?.trim() ?? '',
        note: row.note?.trim() ?? '',
        source_hash: sourceHash,
      },
      source_hash: sourceHash,
      is_duplicate: false,
      has_conflict: false,
    },
  };
}

/**
 * Import course data from an Excel or CSV buffer.
 * Supports CSV with columns: courseName, teacher, location, weekday, startSection, endSection, startWeek, endWeek, weekPattern, note
 */
export function importXlsx(buffer: ArrayBuffer, semesterName?: string): ImportResult {
  const errors: ImportError[] = [];
  const courses: ImportCourseItem[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<CsvRow>(sheet);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = parseRow(row, i, semesterName ?? '');

      if (result.error) {
        errors.push(result.error);
      } else if (result.item) {
        courses.push(result.item);
      }
    }
  } catch (err) {
    errors.push({
      index: -1,
      field: 'file',
      message: `文件解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      raw_data: null,
    });
  }

  return {
    semester: { name: semesterName ?? '', start_date: '', weeks_count: 18 },
    courses,
    errors,
    conflicts: [],
    total_count: courses.length,
  };
}

/**
 * Import course data from a CSV string.
 */
export function importCsv(csvText: string, semesterName?: string): ImportResult {
  const errors: ImportError[] = [];
  const courses: ImportCourseItem[] = [];

  try {
    // Parse CSV using xlsx
    const workbook = XLSX.read(csvText, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<CsvRow>(sheet);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = parseRow(row, i, semesterName ?? '');

      if (result.error) {
        errors.push(result.error);
      } else if (result.item) {
        courses.push(result.item);
      }
    }
  } catch (err) {
    errors.push({
      index: -1,
      field: 'csv',
      message: `CSV 解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      raw_data: null,
    });
  }

  return {
    semester: { name: semesterName ?? '', start_date: '', weeks_count: 18 },
    courses,
    errors,
    conflicts: [],
    total_count: courses.length,
  };
}
