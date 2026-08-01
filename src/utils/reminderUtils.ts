import type { Semester } from '../domain/Semester';
import type { CourseEvent } from '../domain/CourseEvent';
import { getMondayOfWeek } from './dateUtils';

const SETTINGS_KEY = 'reminderSettings';

export interface ReminderSettings {
  enabled: boolean;
  defaultLeadMinutes: number;  // 默认提前多少分钟提醒
  displaySeconds: number;      // 弹窗持续多少秒
  desktopNotification: boolean; // 桌面系统通知
  appNotification: boolean;     // 应用内弹窗
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  defaultLeadMinutes: 30,
  displaySeconds: 10,
  desktopNotification: true,
  appNotification: true,
};

/** 从 localStorage 读取提醒设置 */
export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

/** 保存提醒设置到 localStorage */
export function saveReminderSettings(settings: ReminderSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** 计算某个课程事件的绝对日期时间 */
export function computeEventDateTime(
  semester: Semester,
  week: number,
  weekday: number,
  startTime: string  // HH:MM
): Date {
  const monday = getMondayOfWeek(week, semester.start_date);
  // weekday: 1=Mon, 7=Sun → offset = weekday - 1
  const eventDate = new Date(monday);
  eventDate.setDate(eventDate.getDate() + (weekday - 1));

  const [hours, minutes] = startTime.split(':').map(Number);
  eventDate.setHours(hours, minutes, 0, 0);
  return eventDate;
}

/** 某个事件是否在当前周有效（考虑 week_pattern） */
export function isEventActiveInWeek(event: CourseEvent, week: number): boolean {
  if (week < event.start_week || week > event.end_week) return false;
  if (event.week_pattern === 'all') return true;
  if (event.week_pattern === 'odd') return week % 2 === 1;
  if (event.week_pattern === 'even') return week % 2 === 0;
  return true;
}

/**
 * 格式化为 datetime-local 输入框可用的字符串 (YYYY-MM-DDTHH:MM)
 */
export function formatDateTimeLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

