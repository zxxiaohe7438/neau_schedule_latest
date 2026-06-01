/**
 * Extract course data from network responses.
 * This is a placeholder for future implementation with Playwright.
 */

import type { Course, ParseError } from './types';

interface NetworkResponse {
  url: string;
  body: unknown;
}

/**
 * Try to extract courses from network response body.
 * This is a best-effort implementation that looks for common patterns.
 */
export function extractFromNetwork(response: NetworkResponse): { courses: Course[]; errors: ParseError[] } {
  const courses: Course[] = [];
  const errors: ParseError[] = [];

  // Log for debugging
  console.log(`检查网络响应: ${response.url}`);

  // Try to find course-like data in response
  const body = response.body;
  if (typeof body === 'object' && body !== null) {
    // Look for arrays that might contain course data
    const entries = Object.entries(body);
    for (const [key, value] of entries) {
      if (Array.isArray(value) && value.length > 0) {
        console.log(`发现数组字段 "${key}"，包含 ${value.length} 条记录`);

        // Check if first item looks like a course
        const first = value[0];
        if (typeof first === 'object' && first !== null) {
          const hasCourseFields = 'courseName' in first || 'course_name' in first ||
            'teacher' in first || 'location' in first;
          if (hasCourseFields) {
            console.log(`字段 "${key}" 可能包含课程数据`);
          }
        }
      }
    }
  }

  if (courses.length === 0) {
    errors.push({
      index: -1,
      field: 'network',
      message: '未能从网络响应中提取课程数据。可能需要手动解析或提供真实接口响应样本。',
    });
  }

  return { courses, errors };
}
