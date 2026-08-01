/**
 * Course color assignment utilities.
 * Ensures stable color assignment based on course name.
 */

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
 * Different courses尽量 different colors.
 */
export function getCourseColor(courseName: string): string {
  const hash = hashString(courseName);
  const index = hash % COURSE_COLORS.length;
  return COURSE_COLORS[index];
}
