import { describe, it, expect } from 'vitest';
import { buildUpdateClause } from '../src/db/updateHelper';

describe('buildUpdateClause', () => {
  it('跳过值为 undefined 的字段（单字段更新场景）', () => {
    const upd = buildUpdateClause([
      ['course_number', undefined],
      ['name', undefined],
      ['teacher', undefined],
      ['color', '#dd3c3c'],
      ['units', undefined],
    ]);
    expect(upd).not.toBeNull();
    expect(upd!.clause).toBe('color = ?');
    expect(upd!.values).toEqual(['#dd3c3c']);
  });

  it('跳过整个为 undefined 的字段元组', () => {
    const upd = buildUpdateClause([
      undefined,
      ['name', '大学英语'],
      undefined,
    ]);
    expect(upd!.clause).toBe('name = ?');
    expect(upd!.values).toEqual(['大学英语']);
  });

  it('全部字段 undefined 时返回 null（调用方应直接返回现有行）', () => {
    const upd = buildUpdateClause([
      ['name', undefined],
      ['color', undefined],
    ]);
    expect(upd).toBeNull();
  });

  it('保留附加表达式（如 updated_at = datetime(now)）', () => {
    const upd = buildUpdateClause([['color', '#123456']], ["updated_at = datetime('now')"]);
    expect(upd!.clause).toBe("color = ?, updated_at = datetime('now')");
    expect(upd!.values).toEqual(['#123456']);
  });
});
