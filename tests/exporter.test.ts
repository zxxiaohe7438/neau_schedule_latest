import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { extractFromHtml } from '../tools/neau-timetable-exporter/src/extractFromHtml';
import { normalizeToTimetableJson } from '../tools/neau-timetable-exporter/src/normalizeToTimetableJson';

describe('NEAU Timetable Exporter', () => {
  const fixturePath = path.join(__dirname, '..', 'tools', 'neau-timetable-exporter', 'fixtures', 'sample-neau-page.html');
  const fixtureHtml = readFileSync(fixturePath, 'utf-8');

  describe('extractFromHtml', () => {
    it('should extract courses from sample HTML', () => {
      const { courses, errors } = extractFromHtml(fixtureHtml);
      expect(errors).toHaveLength(0);
      expect(courses.length).toBeGreaterThan(0);
    });

    it('should extract course name correctly', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const first = courses[0];
      expect(first.courseName).toBe('数据库原理与应用');
    });

    it('should extract teacher correctly', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const first = courses[0];
      expect(first.teacher).toBe('张老师');
    });

    it('should extract location correctly', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const first = courses[0];
      expect(first.location).toBe('成栋楼A101');
    });

    it('should extract weekday correctly', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const first = courses[0];
      expect(first.weekday).toBe(1);
    });

    it('should extract section range correctly', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const first = courses[0];
      expect(first.startSection).toBe(1);
      expect(first.endSection).toBe(2);
    });

    it('should extract week range correctly', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const first = courses[0];
      expect(first.startWeek).toBe(1);
      expect(first.endWeek).toBe(16);
    });

    it('should handle odd week pattern', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const oddCourse = courses.find(c => c.weekPattern === 'odd');
      expect(oddCourse).toBeDefined();
      expect(oddCourse!.courseName).toBe('操作系统');
    });

    it('should handle even week pattern', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const evenCourse = courses.find(c => c.weekPattern === 'even');
      expect(evenCourse).toBeDefined();
      expect(evenCourse!.courseName).toBe('软件工程');
    });
  });

  describe('normalizeToTimetableJson', () => {
    it('should normalize courses to timetable.json format', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const result = normalizeToTimetableJson(courses, fixtureHtml);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should have correct version', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const result = normalizeToTimetableJson(courses, fixtureHtml);

      expect(result.data!.version).toBe(1);
    });

    it('should have correct school', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const result = normalizeToTimetableJson(courses, fixtureHtml);

      expect(result.data!.school).toBe('东北农业大学');
    });

    it('should have correct source', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const result = normalizeToTimetableJson(courses, fixtureHtml);

      expect(result.data!.source).toBe('neau-student-system');
    });

    it('should have semester info', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const result = normalizeToTimetableJson(courses, fixtureHtml);

      expect(result.data!.semester).toBeDefined();
      expect(result.data!.semester.name).toBeDefined();
      expect(result.data!.semester.startDate).toBeDefined();
      expect(result.data!.semester.weeksCount).toBeGreaterThan(0);
    });

    it('should have section times', () => {
      const { courses } = extractFromHtml(fixtureHtml);
      const result = normalizeToTimetableJson(courses, fixtureHtml);

      expect(result.data!.sectionTimes).toBeDefined();
      expect(result.data!.sectionTimes.length).toBeGreaterThan(0);
    });

    it('should return error for empty courses', () => {
      const result = normalizeToTimetableJson([]);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
