import { useState, useEffect, useCallback } from 'react';
import type { Semester } from '../domain/Semester';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import type { SectionTime } from '../domain/SectionTime';
import type { CellAnnotation, CellAnnotationCreateInput } from '../domain/CellAnnotation';
import { getWeekNumber } from '../utils/dateUtils';
import { assignCourseColors } from '../utils/courseColor';

/**
 * 学期/课程/事件/节次/备注数据加载与变更管理。
 * 收敛了原 App.tsx 中的全部数据状态与数据操作回调。
 */
export function useScheduleData() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Data for active semester
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<CourseEvent[]>([]);
  const [sectionTimes, setSectionTimes] = useState<SectionTime[]>([]);
  const [cellAnnotations, setCellAnnotations] = useState<CellAnnotation[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [unscheduledCourses, setUnscheduledCourses] = useState<Course[]>([]);

  const reloadSemesters = useCallback(async (): Promise<Semester[]> => {
    const list = await window.api.semester.list();
    setSemesters(list);
    return list;
  }, []);

  // 初载：自动选中第一个非归档学期
  useEffect(() => {
    (async () => {
      try {
        await reloadSemesters();
      } catch (err) {
        console.error('Failed to load semesters:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadSemesters]);

  // 初载后自动选中
  useEffect(() => {
    if (!loading && activeSemesterId === null) {
      const active = semesters.find((s) => !s.is_archived);
      if (active) {
        setActiveSemesterId(active.id);
      }
    }
  }, [loading, semesters, activeSemesterId]);

  // Load semester data when active semester changes
  useEffect(() => {
    if (!activeSemesterId) {
      setCourses([]);
      setEvents([]);
      setSectionTimes([]);
      setUnscheduledCourses([]);
      return;
    }

    const loadSemesterData = async () => {
      try {
        const [courseList, eventList, timeList, annotationList] = await Promise.all([
          window.api.course.listBySemester(activeSemesterId),
          window.api.courseEvent.listBySemester(activeSemesterId),
          window.api.sectionTime.listBySemester(activeSemesterId),
          window.api.cellAnnotation.listBySemester(activeSemesterId),
        ]);

        // 课表配色统一：同名课程共享颜色、不同课程黄金角色相互不重复。
        // 与分配结果不一致的课程（历史数据/哈希色板残留）自动修正。
        // 修复失败不阻塞数据加载（防御：Electron 序列化 undefined 参数会抛错）
        let loadedCourses = courseList;
        try {
          const assigned = assignCourseColors(courseList);
          const colorFixes = courseList.filter((c) => {
            const target = assigned.get(c.id);
            return target !== undefined && c.color !== target;
          });
          for (const c of colorFixes) {
            const target = assigned.get(c.id);
            if (target === undefined) continue;
            await window.api.course.update(c.id, { color: target });
          }
          if (colorFixes.length > 0) {
            loadedCourses = await window.api.course.listBySemester(activeSemesterId);
          }
        } catch (err) {
          console.error('Failed to unify course colors:', err);
        }

        setCourses(loadedCourses);
        setEvents(eventList);
        setSectionTimes(timeList);
        setCellAnnotations(annotationList);

        // Find unscheduled courses (courses without events)
        const courseIdsWithEvents = new Set(eventList.map(e => e.course_id));
        const unscheduled = loadedCourses.filter(c => !courseIdsWithEvents.has(c.id));
        setUnscheduledCourses(unscheduled);

        // Calculate current week based on today's date
        const semester = semesters.find((s) => s.id === activeSemesterId);
        if (semester) {
          const week = getWeekNumber(new Date(), semester.start_date);
          const clamped = Math.max(1, Math.min(week, semester.weeks_count));
          setCurrentWeek(clamped > 0 ? clamped : 1);
        }
      } catch (err) {
        console.error('Failed to load semester data:', err);
      }
    };

    loadSemesterData();
  }, [activeSemesterId, semesters]);

  /** 重新加载当前学期的课程与事件（编辑保存后刷新） */
  const reloadActiveSemesterData = useCallback(async () => {
    if (!activeSemesterId) return;
    const [courseList, eventList] = await Promise.all([
      window.api.course.listBySemester(activeSemesterId),
      window.api.courseEvent.listBySemester(activeSemesterId),
    ]);
    setCourses(courseList);
    setEvents(eventList);
  }, [activeSemesterId]);

  /** 重新加载当前学期的备注 */
  const reloadAnnotations = useCallback(async () => {
    if (!activeSemesterId) return;
    const annotations = await window.api.cellAnnotation.listBySemester(activeSemesterId);
    setCellAnnotations(annotations);
  }, [activeSemesterId]);

  const selectSemester = useCallback((id: number) => {
    setActiveSemesterId(id);
  }, []);

  const addSemester = useCallback((semester: Semester) => {
    setSemesters((prev) => [semester, ...prev]);
    setActiveSemesterId(semester.id);
  }, []);

  const removeSemester = useCallback((id: number) => {
    setSemesters((prev) => prev.filter((s) => s.id !== id));
    setActiveSemesterId((prev) => (prev === id ? null : prev));
  }, []);

  const seedMockData = useCallback(async (): Promise<Semester | null> => {
    if (!window.api.dev) return null;
    try {
      const semester = await window.api.dev.seed();
      setSemesters((prev) => [semester, ...prev]);
      setActiveSemesterId(semester.id);
      return semester;
    } catch (err) {
      console.error('Failed to seed mock data:', err);
      return null;
    }
  }, []);

  /** 清空全部数据（删除所有学期，不可恢复），随后重置全部前端状态 */
  const clearAllData = useCallback(async () => {
    try {
      await window.api.semester.clearAll();
      setSemesters([]);
      setActiveSemesterId(null);
      setCourses([]);
      setEvents([]);
      setSectionTimes([]);
      setCellAnnotations([]);
      setUnscheduledCourses([]);
      setCurrentWeek(1);
    } catch (err) {
      console.error('Failed to clear all data:', err);
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: number) => {
    try {
      await window.api.courseEvent.delete(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  }, []);

  const deleteCourse = useCallback(async (courseId: number) => {
    try {
      await window.api.course.delete(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setEvents((prev) => prev.filter((e) => e.course_id !== courseId));
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  }, []);

  /** 清空当前学期课表内容（课程/事件/格子备注），保留学期与节次时间 */
  const clearSchedule = useCallback(async () => {
    if (!activeSemesterId) return;
    try {
      await window.api.semester.clearSchedule(activeSemesterId);
      setCourses([]);
      setEvents([]);
      setUnscheduledCourses([]);
      setCellAnnotations([]);
    } catch (err) {
      console.error('Failed to clear schedule:', err);
    }
  }, [activeSemesterId]);

  const saveAnnotation = useCallback(
    async (input: CellAnnotationCreateInput): Promise<number | null> => {
      try {
        const created = await window.api.cellAnnotation.create(input);
        await reloadAnnotations();
        return created?.id ?? null;
      } catch (err) {
        alert(err instanceof Error ? err.message : '保存备注失败');
        return null;
      }
    },
    [reloadAnnotations]
  );

  const updateAnnotation = useCallback(
    async (id: number, note: string, color: string) => {
      try {
        await window.api.cellAnnotation.update(id, { note, color });
        await reloadAnnotations();
      } catch (err) {
        alert(err instanceof Error ? err.message : '更新备注失败');
      }
    },
    [reloadAnnotations]
  );

  const deleteAnnotation = useCallback(
    async (id: number) => {
      try {
        await window.api.cellAnnotation.delete(id);
        await reloadAnnotations();
      } catch (err) {
        alert(err instanceof Error ? err.message : '删除备注失败');
      }
    },
    [reloadAnnotations]
  );

  const activeSemester = semesters.find((s) => s.id === activeSemesterId);

  return {
    semesters,
    activeSemesterId,
    activeSemester,
    loading,
    courses,
    events,
    sectionTimes,
    cellAnnotations,
    currentWeek,
    unscheduledCourses,
    setCurrentWeek,
    reloadSemesters,
    reloadActiveSemesterData,
    selectSemester,
    addSemester,
    removeSemester,
    seedMockData,
    clearAllData,
    deleteEvent,
    deleteCourse,
    clearSchedule,
    saveAnnotation,
    updateAnnotation,
    deleteAnnotation,
  };
}
