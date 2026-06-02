import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { importSchoolIndex } from '../src/importers/schoolIndexImporter';

describe('Mock Callback Importer', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'mock-callback-response.json');
  const fixtureData = readFileSync(fixturePath, 'utf-8');

  it('should parse mock callback response without errors', () => {
    const result = importSchoolIndex(fixtureData);
    const realErrors = result.errors.filter(e => e.field !== 'timeAndPlaceList');
    expect(realErrors).toHaveLength(0);
  });

  it('should extract 5 scheduled courses + 1 unscheduled', () => {
    const result = importSchoolIndex(fixtureData);
    expect(result.courses).toHaveLength(5);
    expect(result.unscheduled_courses).toHaveLength(1);
  });

  it('should extract course names correctly', () => {
    const result = importSchoolIndex(fixtureData);
    const names = result.courses.map(c => c.course_name);
    expect(names).toContain('数据库原理与应用');
    expect(names).toContain('数据结构');
    expect(names).toContain('操作系统');
    expect(names).toContain('计算机网络');
    expect(names).toContain('人工智能导论');
  });

  it('should extract teacher names (without trailing *)', () => {
    const result = importSchoolIndex(fixtureData);
    const dbCourse = result.courses.find(c => c.course_name === '数据库原理与应用');
    expect(dbCourse?.teacher).toBe('张老师');
  });

  it('should extract locations correctly', () => {
    const result = importSchoolIndex(fixtureData);
    const dbCourse = result.courses.find(c => c.course_name === '数据库原理与应用');
    expect(dbCourse?.event.location).toBe('成栋楼A101');
  });

  it('should detect odd week pattern for 操作系统', () => {
    const result = importSchoolIndex(fixtureData);
    const osCourse = result.courses.find(c => c.course_name === '操作系统');
    expect(osCourse?.event.week_pattern).toBe('odd');
  });

  it('should detect even week pattern for 人工智能导论', () => {
    const result = importSchoolIndex(fixtureData);
    const aiCourse = result.courses.find(c => c.course_name === '人工智能导论');
    expect(aiCourse?.event.week_pattern).toBe('even');
  });

  it('should detect semester name as 2025-2026-2', () => {
    const result = importSchoolIndex(fixtureData);
    expect(result.semester.name).toBe('2025-2026-2');
  });

  it('should detect unscheduled course (农科大学生创业基础)', () => {
    const result = importSchoolIndex(fixtureData);
    const unscheduled = result.unscheduled_courses;
    expect(unscheduled).toHaveLength(1);
    expect(unscheduled[0].course_name).toBe('农科大学生创业基础');
  });

  it('should calculate correct week range for 计算机网络 (1-18周)', () => {
    const result = importSchoolIndex(fixtureData);
    const netCourse = result.courses.find(c => c.course_name === '计算机网络');
    expect(netCourse?.event.start_week).toBe(1);
    expect(netCourse?.event.end_week).toBe(18);
  });

  it('should compute source_hash for each course', () => {
    const result = importSchoolIndex(fixtureData);
    for (const course of result.courses) {
      expect(course.source_hash).toBeTruthy();
      expect(course.source_hash.length).toBe(16);
    }
  });
});
