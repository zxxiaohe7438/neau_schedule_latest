import { describe, it, expect } from 'vitest';
import { importClipboard } from '../src/importers/clipboardImporter';

describe('Clipboard Importer', () => {
  it('should parse simple text format', () => {
    const text = `数据库原理与应用 张老师 成栋楼A101 周一 1-2节 1-16周
数据结构 李老师 成栋楼B203 周二 3-4节 1-16周`;

    const result = importClipboard(text, '2025-2026-2');
    expect(result.total_count).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should extract course data correctly', () => {
    const text = '数据库原理与应用 张老师 成栋楼A101 周一 1-2节 1-16周';
    const result = importClipboard(text, '2025-2026-2');

    const course = result.courses[0];
    expect(course.course_name).toBe('数据库原理与应用');
    expect(course.teacher).toBe('张老师');
    expect(course.event.location).toBe('成栋楼A101');
    expect(course.event.weekday).toBe(1);
    expect(course.event.start_section).toBe(1);
    expect(course.event.end_section).toBe(2);
    expect(course.event.start_week).toBe(1);
    expect(course.event.end_week).toBe(16);
    expect(course.event.week_pattern).toBe('all');
  });

  it('should handle odd/even week patterns', () => {
    const text = '操作系统 王老师 成栋楼C305 周三 1-2节 1-16周 单周';
    const result = importClipboard(text, '2025-2026-2');

    expect(result.courses[0].event.week_pattern).toBe('odd');
  });

  it('should handle even week pattern', () => {
    const text = '软件工程 刘老师 成栋楼B102 周五 3-4节 1-16周 双周';
    const result = importClipboard(text, '2025-2026-2');

    expect(result.courses[0].event.week_pattern).toBe('even');
  });

  it('should return error for unparseable lines', () => {
    const text = '这是一行无法解析的文本';
    const result = importClipboard(text, '2025-2026-2');

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.courses).toHaveLength(0);
  });

  it('should generate stable source hashes', () => {
    const text = '数据库原理与应用 张老师 成栋楼A101 周一 1-2节 1-16周';
    const result1 = importClipboard(text, '2025-2026-2');
    const result2 = importClipboard(text, '2025-2026-2');

    expect(result1.courses[0].source_hash).toBe(result2.courses[0].source_hash);
  });
});
