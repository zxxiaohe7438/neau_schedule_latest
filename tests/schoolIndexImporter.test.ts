import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { importSchoolIndex } from '../src/importers/schoolIndexImporter';

describe('School Index Importer', () => {
  const fixturePath = path.join(__dirname, '..', 'gptdata', 'callback_response.txt');
  let fixtureData: string;

  try {
    fixtureData = readFileSync(fixturePath, 'utf-8');
  } catch {
    fixtureData = '';
  }

  const skipIfNoFixture = fixtureData ? it : it.skip;

  skipIfNoFixture('should parse NEAU callback response', () => {
    const result = importSchoolIndex(fixtureData);
    expect(result.total_count).toBeGreaterThan(0);
    // Some courses may have no scheduled time (warnings, not errors)
    const realErrors = result.errors.filter(e => e.field !== 'timeAndPlaceList');
    expect(realErrors.length).toBe(0);
  });

  skipIfNoFixture('should extract course names', () => {
    const result = importSchoolIndex(fixtureData);
    const courseNames = result.courses.map(c => c.course_name);
    expect(courseNames).toContain('计算机组成原理');
    expect(courseNames).toContain('人工智能导论');
  });

  skipIfNoFixture('should extract teacher names', () => {
    const result = importSchoolIndex(fixtureData);
    const teachers = result.courses.map(c => c.teacher);
    expect(teachers.some(t => t.includes('常卓卿'))).toBe(true);
    expect(teachers.some(t => t.includes('代昕'))).toBe(true);
  });

  skipIfNoFixture('should extract locations', () => {
    const result = importSchoolIndex(fixtureData);
    const locations = result.courses.map(c => c.event.location);
    expect(locations.some(l => l.includes('教106'))).toBe(true);
    expect(locations.some(l => l.includes('研427'))).toBe(true);
  });

  skipIfNoFixture('should extract weekday correctly', () => {
    const result = importSchoolIndex(fixtureData);
    const weekdays = result.courses.map(c => c.event.weekday);
    expect(weekdays.every(w => w >= 1 && w <= 7)).toBe(true);
  });

  skipIfNoFixture('should extract section range correctly', () => {
    const result = importSchoolIndex(fixtureData);
    const sections = result.courses.map(c => ({
      start: c.event.start_section,
      end: c.event.end_section,
    }));
    expect(sections.every(s => s.start >= 1 && s.end >= s.start)).toBe(true);
  });

  skipIfNoFixture('should handle odd/even week patterns', () => {
    const result = importSchoolIndex(fixtureData);
    const oddCourses = result.courses.filter(c => c.event.week_pattern === 'odd');
    const evenCourses = result.courses.filter(c => c.event.week_pattern === 'even');
    // 计算机组成原理 has odd week pattern
    expect(oddCourses.some(c => c.course_name === '计算机组成原理')).toBe(true);
  });

  skipIfNoFixture('should detect semester name', () => {
    const result = importSchoolIndex(fixtureData);
    expect(result.semester.name).toContain('2025-2026');
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
});
