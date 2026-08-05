/**
 * Course color assignment utilities.
 *
 * 两套分配：
 * - `getCourseColor(name)`：按课程名哈希的稳定色（12 色板）。用于导入等即时场景，
 *   同名必同色；课程数超过色板数时会出现不同课程同色。
 * - `assignCourseColors(courses)`：黄金角均匀色相（按课程名分组 + 名称排序后逐组分配），
 *   任意数量的不同课程都获得互不重复、肉眼可辨的颜色；同名课程共享同一颜色。
 *   用于学期数据加载时统一课表配色（不同科目不同色、同名科目同色）。
 */

import type { Course } from '../domain/Course';
import { COURSE_COLORS } from '../domain/Course';

/**
 * Simple hash function for strings.
 * Returns a non-negative integer.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a stable color for a course based on its name.
 * Same course name always returns the same color.
 */
export function getCourseColor(courseName: string): string {
  const hash = hashString(courseName);
  const index = hash % COURSE_COLORS.length;
  return COURSE_COLORS[index];
}

/**
 * 黄金角均匀色相生成（第 i 个颜色）。
 * 137.508° 黄金角保证任意数量颜色在色相环上均匀分布、相邻色相差异明显。
 */
function goldenAngleColor(index: number): string {
  const hue = Math.round((index * 137.508) % 360);
  return hslToHex(hue, 70, 55);
}

/** HSL → hex（s/l 为百分比数值，如 70 = 70%） */
function hslToHex(h: number, s: number, l: number): string {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = chroma; g = x; }
  else if (h < 120) { r = x; g = chroma; }
  else if (h < 180) { g = chroma; b = x; }
  else if (h < 240) { g = x; b = chroma; }
  else if (h < 300) { r = x; b = chroma; }
  else { r = chroma; b = x; }
  const toHex = (v: number): string =>
    Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 为学期全部课程分配课表颜色（courseId → color）。
 *
 * 规则：
 * 1. 同名课程共享同一颜色（按课程名分组）；
 * 2. 不同课程名按名称排序后逐组分配黄金角色相 → 不同科目互不重复；
 * 3. 名称排序保证分配结果确定（刷新/切换学期结果一致）。
 */
export function assignCourseColors(courses: Course[]): Map<number, string> {
  // 按课程名分组：同名课程共享颜色
  const groups = new Map<string, number[]>();
  for (const c of courses) {
    const ids = groups.get(c.name) ?? [];
    ids.push(c.id);
    groups.set(c.name, ids);
  }

  // 按名称排序（确定性顺序，保证每次分配结果一致）
  const names = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const assignments = new Map<string, string>();
  names.forEach((name, i) => {
    assignments.set(name, goldenAngleColor(i));
  });

  const result = new Map<number, string>();
  for (const [name, ids] of groups) {
    const color = assignments.get(name)!;
    for (const id of ids) {
      result.set(id, color);
    }
  }
  return result;
}
