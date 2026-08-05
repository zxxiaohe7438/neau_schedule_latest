import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { importSchoolIndex } from '../src/importers/schoolIndexImporter';

describe('School Index Importer', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'mock-callback-response.json');
  const fixtureData = readFileSync(fixturePath, 'utf-8');

  it('should parse NEAU callback response', () => {
    const result = importSchoolIndex(fixtureData);
    expect(result.total_count).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  });

  it('should extract course names', () => {
    const result = importSchoolIndex(fixtureData);
    const courseNames = result.courses.map((c) => c.course_name);
    expect(courseNames).toContain('数据库原理与应用');
    expect(courseNames).toContain('数据结构');
    expect(courseNames).toContain('操作系统');
    expect(courseNames).toContain('计算机网络');
    expect(courseNames).toContain('人工智能导论');
  });

  it('should strip trailing * from teacher names', () => {
    const result = importSchoolIndex(fixtureData);
    const teachers = result.courses.map((c) => c.teacher);
    expect(teachers).toContain('张老师');
    expect(teachers.some((t) => t.includes('*'))).toBe(false);
  });

  it('should extract course number (coureNumber) into course_number', () => {
    const result = importSchoolIndex(fixtureData);
    const dbCourse = result.courses.find((c) => c.course_name === '数据库原理与应用');
    expect(dbCourse?.course_number).toBeTruthy();
    expect(dbCourse?.course_number).toMatch(/^[0-9a-zA-Z]+$/);
    // 同一门课的所有事件共享课程编号
    const sameName = result.courses.filter((c) => c.course_name === '数据库原理与应用');
    expect(new Set(sameName.map((c) => c.course_number)).size).toBe(1);
  });

  it('should extract locations (campus + building + room)', () => {
    const result = importSchoolIndex(fixtureData);
    const locations = result.courses.map((c) => c.event.location);
    expect(locations).toContain('成栋楼A101');
    expect(locations).toContain('研究生楼研427');
  });

  it('should extract weekday correctly', () => {
    const result = importSchoolIndex(fixtureData);
    const weekdays = result.courses.map((c) => c.event.weekday);
    expect(weekdays.every((w) => w >= 1 && w <= 7)).toBe(true);
    expect(weekdays).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
  });

  it('should extract section range correctly', () => {
    const result = importSchoolIndex(fixtureData);
    const sections = result.courses.map((c) => ({
      start: c.event.start_section,
      end: c.event.end_section,
    }));
    expect(sections.every((s) => s.start >= 1 && s.end >= s.start)).toBe(true);
    // 数据库原理与应用: 周一 1-2节
    const dbCourse = result.courses.find((c) => c.course_name === '数据库原理与应用');
    expect(dbCourse?.event.start_section).toBe(1);
    expect(dbCourse?.event.end_section).toBe(2);
  });

  it('should handle odd/even week patterns', () => {
    const result = importSchoolIndex(fixtureData);
    const oddCourses = result.courses.filter((c) => c.event.week_pattern === 'odd');
    const evenCourses = result.courses.filter((c) => c.event.week_pattern === 'even');
    // 操作系统: 单周；人工智能导论: 双周
    expect(oddCourses.some((c) => c.course_name === '操作系统')).toBe(true);
    expect(evenCourses.some((c) => c.course_name === '人工智能导论')).toBe(true);
  });

  it('should parse week range from classWeek binary string', () => {
    const result = importSchoolIndex(fixtureData);
    // 计算机网络: 1-18周
    const network = result.courses.find((c) => c.course_name === '计算机网络');
    expect(network?.event.start_week).toBe(1);
    expect(network?.event.end_week).toBe(18);
  });

  it('should detect semester name from plan number', () => {
    const result = importSchoolIndex(fixtureData);
    expect(result.semester.name).toBe('2025-2026-2');
    // 第一学期 = 第一年 9 月第一个周一；第二学期 = 第二年 3 月第一个周一
    expect(result.semester.start_date).toBe('2026-03-02');
    expect(result.semester.weeks_count).toBe(18);
  });

  it('should collect courses without scheduled time as unscheduled', () => {
    const result = importSchoolIndex(fixtureData);
    const unscheduled = result.unscheduled_courses ?? [];
    expect(unscheduled.some((c) => c.course_name === '农科大学生创业基础')).toBe(true);
  });

  it('should accept already-parsed JSON object', () => {
    const data = JSON.parse(fixtureData);
    const result = importSchoolIndex(data);
    expect(result.total_count).toBeGreaterThan(0);
  });

  it('should handle invalid JSON', () => {
    const result = importSchoolIndex('invalid json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.total_count).toBe(0);
  });

  it('should handle empty response', () => {
    const result = importSchoolIndex('{}');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.total_count).toBe(0);
  });

  it('should handle response without xkxx field (e.g. login expired)', () => {
    const result = importSchoolIndex('{"message":"登录已过期"}');
    expect(result.errors.some((e) => e.field === 'xkxx')).toBe(true);
    expect(result.total_count).toBe(0);
  });
});
