import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { importCsv } from '../src/importers/xlsxImporter';

describe('CSV Importer', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'sample-timetable.csv');
  const fixtureCsv = readFileSync(fixturePath, 'utf-8');

  it('should parse valid CSV fixture', () => {
    const result = importCsv(fixtureCsv, '2025-2026-2');
    expect(result.total_count).toBe(5);
    expect(result.errors).toHaveLength(0);
  });

  it('should extract course data correctly', () => {
    const result = importCsv(fixtureCsv, '2025-2026-2');
    const first = result.courses[0];
    expect(first.course_name).toBe('数据库原理与应用');
    expect(first.teacher).toBe('张老师');
    expect(first.event.location).toBe('成栋楼A101');
    expect(first.event.weekday).toBe(1);
    expect(first.event.start_section).toBe(1);
    expect(first.event.end_section).toBe(2);
  });

  it('should handle odd/even week patterns', () => {
    const result = importCsv(fixtureCsv, '2025-2026-2');
    const oddCourse = result.courses.find((c) => c.event.week_pattern === 'odd');
    expect(oddCourse).toBeDefined();
    expect(oddCourse!.course_name).toBe('操作系统');

    const evenCourse = result.courses.find((c) => c.event.week_pattern === 'even');
    expect(evenCourse).toBeDefined();
    expect(evenCourse!.course_name).toBe('软件工程');
  });

  it('should return error for invalid CSV', () => {
    const result = importCsv('invalid,csv\n1,2,3', '2025-2026-2');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should generate stable source hashes', () => {
    const result1 = importCsv(fixtureCsv, '2025-2026-2');
    const result2 = importCsv(fixtureCsv, '2025-2026-2');
    expect(result1.courses[0].source_hash).toBe(result2.courses[0].source_hash);
  });
});
