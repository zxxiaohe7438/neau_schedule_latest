/**
 * Date and week calculation utilities for the timetable.
 */

/** Day-of-week labels in Chinese (1=Monday .. 7=Sunday) */
export const WEEKDAY_LABELS: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
};

/**
 * Get the Monday of the week containing the given date.
 * Returns a new Date set to 00:00 of that Monday.
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate which week number a given date falls in, relative to the semester start date.
 * Week 1 starts on the Monday of the week containing startDate.
 * Returns 0 if the date is before the semester start week.
 */
export function getWeekNumber(date: Date, semesterStartDate: string): number {
  const semesterStart = new Date(semesterStartDate);
  const startMonday = getMonday(semesterStart);
  const targetMonday = getMonday(date);
  const diffMs = targetMonday.getTime() - startMonday.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Format a Date as M/D for compact display.
 */
export function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Get the date for a specific weekday in a given week.
 * weekMonday is the Monday of the target week.
 * weekday: 1=Monday, 7=Sunday.
 */
export function getDateOfWeekday(weekMonday: Date, weekday: number): Date {
  const d = new Date(weekMonday);
  d.setDate(d.getDate() + (weekday - 1));
  return d;
}

/**
 * Check if two dates are the same calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Get the Monday of a specific week number in a semester.
 * Week 1 starts on the Monday of the week containing semesterStartDate.
 */
export function getMondayOfWeek(
  weekNumber: number,
  semesterStartDate: string
): Date {
  const semesterStart = new Date(semesterStartDate);
  const startMonday = getMonday(semesterStart);
  const target = new Date(startMonday);
  target.setDate(target.getDate() + (weekNumber - 1) * 7);
  return target;
}
