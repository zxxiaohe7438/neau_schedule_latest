import { describe, it, expect } from 'vitest';
import { assignCourseColors, getCourseColor } from '../src/utils/courseColor';
import type { Course } from '../src/domain/Course';

function makeCourse(id: number, name: string): Course {
  return {
    id,
    semester_id: 1,
    course_number: '',
    name,
    teacher: '',
    color: '#000000',
    units: 0,
    created_at: '',
    updated_at: '',
  };
}

describe('assignCourseColors', () => {
  it('同名课程共享同一颜色', () => {
    const courses = [
      makeCourse(1, '大学英语'),
      makeCourse(2, '大学英语'),
      makeCourse(3, '大学英语'),
    ];
    const colors = assignCourseColors(courses);
    expect(colors.get(1)).toBe(colors.get(2));
    expect(colors.get(2)).toBe(colors.get(3));
  });

  it('不同课程（前 20 门）颜色互不重复', () => {
    const names = [
      '大学英语', '高等数学', '线性代数', '概率论', '大学物理',
      '数据结构', '操作系统', '计算机网络', '数据库原理', '软件工程',
      '编译原理', '计算机组成', '人工智能', '机器学习', '深度学习',
      '数字逻辑', '离散数学', '大学体育', '形势与政策', '毛概',
    ];
    const courses = names.map((n, i) => makeCourse(i + 1, n));
    const colors = assignCourseColors(courses);
    const unique = new Set(colors.values());
    expect(unique.size).toBe(names.length);
  });

  it('分配结果确定（与输入顺序无关）', () => {
    const names = ['大学英语', '高等数学', '数据结构', '操作系统', '概率论'];
    const byName = (name: string, list: Array<{ id: number; name: string }>) =>
      list.find((c) => c.name === name)!;

    const aCourses = names.map((n, i) => makeCourse(i + 1, n));
    const a = assignCourseColors(aCourses);
    // 输入顺序打乱（reverse），同名课程应分配到相同颜色
    const bCourses = [...names].reverse().map((n, i) => makeCourse(100 + i, n));
    const b = assignCourseColors(bCourses);

    for (const name of names) {
      const aColor = a.get(byName(name, aCourses).id);
      const bColor = b.get(byName(name, bCourses).id);
      expect(aColor).toBe(bColor);
    }
  });

  it('输出为合法 hex 颜色', () => {
    const courses = ['大学英语', '高等数学', '数据结构'].map((n, i) => makeCourse(i + 1, n));
    const colors = assignCourseColors(courses);
    for (const color of colors.values()) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('getCourseColor', () => {
  it('同名课程哈希色稳定一致', () => {
    expect(getCourseColor('大学英语')).toBe(getCourseColor('大学英语'));
    expect(getCourseColor('高等数学')).toBe(getCourseColor('高等数学'));
  });
});
