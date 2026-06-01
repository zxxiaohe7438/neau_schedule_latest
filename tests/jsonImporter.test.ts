import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Import the normalizer logic directly for unit testing
import { normalizeJsonImport } from '../src/importers/normalizer';

describe('JSON Importer', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'sample-timetable.json');
  const fixtureData = JSON.parse(readFileSync(fixturePath, 'utf-8'));

  it('should parse valid JSON fixture', () => {
    const result = normalizeJsonImport(fixtureData);
    expect(result.total_count).toBe(5);
    expect(result.errors).toHaveLength(0);
    expect(result.semester.name).toBe('2025-2026-2');
    expect(result.semester.start_date).toBe('2026-03-02');
    expect(result.semester.weeks_count).toBe(18);
  });

  it('should extract course events correctly', () => {
    const result = normalizeJsonImport(fixtureData);
    const first = result.courses[0];
    expect(first.course_name).toBe('数据库原理与应用');
    expect(first.teacher).toBe('张老师');
    expect(first.event.weekday).toBe(1);
    expect(first.event.start_section).toBe(1);
    expect(first.event.end_section).toBe(2);
    expect(first.event.week_pattern).toBe('all');
  });

  it('should handle odd/even week patterns', () => {
    const result = normalizeJsonImport(fixtureData);
    const oddCourse = result.courses.find((c) => c.event.week_pattern === 'odd');
    expect(oddCourse).toBeDefined();
    expect(oddCourse!.course_name).toBe('操作系统');

    const evenCourse = result.courses.find((c) => c.event.week_pattern === 'even');
    expect(evenCourse).toBeDefined();
    expect(evenCourse!.course_name).toBe('软件工程');
  });

  it('should reject missing courseName', () => {
    const bad = { ...fixtureData, courses: [{ weekday: 1, startSection: 1, endSection: 2, startWeek: 1, endWeek: 16, weekPattern: 'all' }] };
    const result = normalizeJsonImport(bad);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('courseName');
  });

  it('should reject invalid weekday', () => {
    const bad = {
      ...fixtureData,
      courses: [
        {
          courseName: 'Test',
          weekday: 8,
          startSection: 1,
          endSection: 2,
          startWeek: 1,
          endWeek: 16,
          weekPattern: 'all',
        },
      ],
    };
    const result = normalizeJsonImport(bad);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('weekday');
  });

  it('should reject startSection > endSection', () => {
    const bad = {
      ...fixtureData,
      courses: [
        {
          courseName: 'Test',
          weekday: 1,
          startSection: 5,
          endSection: 2,
          startWeek: 1,
          endWeek: 16,
          weekPattern: 'all',
        },
      ],
    };
    const result = normalizeJsonImport(bad);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid weekPattern', () => {
    const bad = {
      ...fixtureData,
      courses: [
        {
          courseName: 'Test',
          weekday: 1,
          startSection: 1,
          endSection: 2,
          startWeek: 1,
          endWeek: 16,
          weekPattern: 'invalid',
        },
      ],
    };
    const result = normalizeJsonImport(bad);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('weekPattern');
  });
});
