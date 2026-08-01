import { useEffect, useRef, useCallback, useState } from 'react';
import type { Semester } from '../domain/Semester';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import type { SectionTime } from '../domain/SectionTime';
import type { CellAnnotation } from '../domain/CellAnnotation';
import { getWeekNumber } from '../utils/dateUtils';
import {
  getReminderSettings,
  isEventActiveInWeek,
  computeEventDateTime,
} from '../utils/reminderUtils';
import { getCustomReminders } from '../utils/customReminders';
import type { ToastItem } from '../components/ReminderToast';

interface UseReminderSchedulerParams {
  semesters: Semester[];
  activeSemesterId: number | null;
  courses: Course[];
  events: CourseEvent[];
  sectionTimes: SectionTime[];
  cellAnnotations: CellAnnotation[];
}

export function useReminderScheduler({
  semesters,
  activeSemesterId,
  courses,
  events,
  sectionTimes,
  cellAnnotations,
}: UseReminderSchedulerParams) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (params: {
      key: string;
      courseName: string;
      courseColor: string;
      teacher: string;
      location: string;
      eventTime: Date;
      displaySeconds: number;
      desktopNotification: boolean;
      appNotification: boolean;
    }) => {
      if (firedRef.current.has(params.key)) return;
      firedRef.current.add(params.key);

      // 桌面系统通知
      if (params.desktopNotification) {
        const timeStr = params.eventTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const body = [
          params.teacher && `教师: ${params.teacher}`,
          params.location && `地点: ${params.location}`,
          `时间: ${timeStr}`,
        ]
          .filter(Boolean)
          .join('\n');

        try {
          if (window.api.notification) {
            window.api.notification.show({
              title: `🔔 ${params.courseName}`,
              body,
            }).catch((err: unknown) => {
              console.error('[reminder] 系统通知失败:', err);
            });
          }
        } catch (err) {
          console.error('[reminder] 通知调用异常:', err);
        }
      }

      // 应用内弹窗
      if (params.appNotification) {
        setToasts((prev) => [
          ...prev,
          {
            id: params.key + '-' + Date.now(),
            courseName: params.courseName,
            courseColor: params.courseColor,
            teacher: params.teacher,
            location: params.location,
            eventTime: params.eventTime,
            displaySeconds: params.displaySeconds,
          },
        ]);
      }
    },
    []
  );

  const tick = useCallback(() => {
    const settings = getReminderSettings();
    if (!settings.enabled) return;
    if (!activeSemesterId) return;

    const semester = semesters.find((s) => s.id === activeSemesterId);
    if (!semester) return;

    const now = new Date();
    const currentWeek = getWeekNumber(now, semester.start_date);
    if (currentWeek < 1 || currentWeek > semester.weeks_count) return;

    const jsDay = now.getDay();
    const todayWeekday = jsDay === 0 ? 7 : jsDay;

    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const timeMap = new Map(sectionTimes.map((t) => [t.section_no, t]));

    const checkRemind = (
      remindAt: Date,
      key: string,
      name: string,
      color: string,
      teacher: string,
      location: string,
      eventTime: Date
    ) => {
      const diff = now.getTime() - remindAt.getTime();
      if (diff >= -30 * 1000 && diff < 30 * 1000) {
        addToast({
          key,
          courseName: name,
          courseColor: color,
          teacher,
          location,
          eventTime,
          displaySeconds: settings.displaySeconds,
          desktopNotification: settings.desktopNotification,
          appNotification: settings.appNotification,
        });
      }
    };

    // === 1. 默认提醒：课程事件 ===
    const todayEvents = events.filter((e) => {
      if (e.weekday !== todayWeekday) return false;
      return isEventActiveInWeek(e, currentWeek);
    });

    for (const event of todayEvents) {
      const course = courseMap.get(event.course_id);
      if (!course) continue;
      const startTime = timeMap.get(event.start_section);
      if (!startTime) continue;

      const eventDateTime = computeEventDateTime(
        semester,
        currentWeek,
        event.weekday,
        startTime.start_time
      );
      const remindAt = new Date(
        eventDateTime.getTime() - settings.defaultLeadMinutes * 60 * 1000
      );
      checkRemind(
        remindAt,
        `default-event-${event.id}-w${currentWeek}`,
        course.name,
        course.color,
        course.teacher,
        event.location,
        eventDateTime
      );
    }

    // === 2. 默认提醒：备注（CellAnnotation）===
    const todayAnnotations = cellAnnotations.filter((a) => {
      if (a.weekday !== todayWeekday) return false;
      if (currentWeek < a.start_week || currentWeek > a.end_week) return false;
      if (a.week_pattern === 'odd' && currentWeek % 2 === 0) return false;
      if (a.week_pattern === 'even' && currentWeek % 2 !== 0) return false;
      return true;
    });

    for (const ann of todayAnnotations) {
      const startTime = timeMap.get(ann.section_no);
      if (!startTime) continue;

      const annDateTime = computeEventDateTime(
        semester,
        currentWeek,
        ann.weekday,
        startTime.start_time
      );
      const remindAt = new Date(
        annDateTime.getTime() - settings.defaultLeadMinutes * 60 * 1000
      );
      checkRemind(
        remindAt,
        `default-ann-${ann.id}-w${currentWeek}`,
        ann.note || '备注',
        ann.color,
        '',
        `第${ann.section_no}节`,
        annDateTime
      );
    }

    // === 3. 自定义提醒 ===
    const customReminders = getCustomReminders();
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const annMap = new Map(cellAnnotations.map((a) => [a.id, a]));

    for (const cr of customReminders) {
      const remindAt = new Date(cr.remind_at);
      const key = `custom-${cr.source_type}-${cr.source_id}-${cr.remind_at}`;

      if (cr.source_type === 'event') {
        const event = eventMap.get(cr.source_id);
        if (!event) continue;
        const course = courseMap.get(event.course_id);
        if (!course) continue;

        const startTime = timeMap.get(event.start_section);
        const eventDateTime = startTime
          ? computeEventDateTime(
              semester,
              currentWeek,
              event.weekday,
              startTime.start_time
            )
          : remindAt;

        checkRemind(
          remindAt,
          key,
          course.name,
          course.color,
          course.teacher,
          event.location,
          eventDateTime
        );
      } else if (cr.source_type === 'annotation') {
        const ann = annMap.get(cr.source_id);
        if (!ann) continue;

        // 检查备注是否在当前周有效
        if (currentWeek < ann.start_week || currentWeek > ann.end_week)
          continue;
        if (ann.week_pattern === 'odd' && currentWeek % 2 === 0) continue;
        if (ann.week_pattern === 'even' && currentWeek % 2 !== 0) continue;

        const startTime = timeMap.get(ann.section_no);
        const annDateTime = startTime
          ? computeEventDateTime(
              semester,
              currentWeek,
              ann.weekday,
              startTime.start_time
            )
          : remindAt;

        checkRemind(
          remindAt,
          key,
          ann.note || '备注',
          ann.color,
          '',
          `第${ann.section_no}节`,
          annDateTime
        );
      }
    }
  }, [
    semesters,
    activeSemesterId,
    courses,
    events,
    sectionTimes,
    cellAnnotations,
    addToast,
  ]);

  useEffect(() => {
    tick();
    const intervalId = setInterval(tick, 30 * 1000);
    return () => clearInterval(intervalId);
  }, [tick]);

  // 跨天时清除已触发记录
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timer = setTimeout(() => {
      firedRef.current.clear();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  // 添加测试 toast
  const addTestToast = useCallback(
    (params: {
      courseName: string;
      courseColor: string;
      teacher: string;
      location: string;
      displaySeconds: number;
    }) => {
      setToasts((prev) => [
        ...prev,
        {
          id: 'test-' + Date.now(),
          ...params,
          eventTime: new Date(),
        },
      ]);
    },
    []
  );

  return { toasts, dismissToast, addTestToast };
}
