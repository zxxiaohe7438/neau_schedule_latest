import { useState, useCallback } from 'react';
import type { Course, CourseUpdateInput } from '../domain/Course';
import type { CourseEvent, CourseEventUpdateInput } from '../domain/CourseEvent';

interface UseCourseEditingOptions {
  /** 当前视图（用于保存/取消后判断是否返回列表视图） */
  view: string;
  /** 数据变更后重新加载课程与事件 */
  onDataChanged: () => Promise<void>;
  /** 退出编辑视图时切换回列表 */
  onExitEditView: () => void;
}

/**
 * 课程/事件编辑状态管理（课表双击与课程列表两个入口共用）。
 * 收敛了原 App.tsx 中的编辑状态与保存/取消逻辑。
 */
export function useCourseEditing({ view, onDataChanged, onExitEditView }: UseCourseEditingOptions) {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingEvent, setEditingEvent] = useState<CourseEvent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  /** 课表双击：以 Modal 打开编辑 */
  const openFromTimetable = useCallback((event: CourseEvent, course: Course) => {
    setEditingCourse(course);
    setEditingEvent(event);
    setShowEditModal(true);
  }, []);

  /** 课程列表双击课程：进入编辑视图 */
  const openCourse = useCallback(
    (course: Course, events: CourseEvent[]) => {
      // Find first event for this course
      const event = events.find((e) => e.course_id === course.id);
      setEditingCourse(course);
      setEditingEvent(event ?? null);
    },
    []
  );

  /** 课程列表双击事件：进入编辑视图 */
  const openEvent = useCallback((event: CourseEvent, courses: Course[]) => {
    const course = courses.find((c) => c.id === event.course_id);
    if (course) {
      setEditingCourse(course);
      setEditingEvent(event);
    }
  }, []);

  const save = useCallback(
    async (courseData: CourseUpdateInput, eventData?: CourseEventUpdateInput) => {
      if (!editingCourse) return;

      try {
        // Update course
        if (Object.keys(courseData).length > 0) {
          await window.api.course.update(editingCourse.id, courseData);
        }

        // Update event
        if (editingEvent && eventData && Object.keys(eventData).length > 0) {
          await window.api.courseEvent.update(editingEvent.id, eventData);
        }

        // Reload data
        await onDataChanged();

        setEditingCourse(null);
        setEditingEvent(null);
        setShowEditModal(false);
        if (view === 'edit') {
          onExitEditView();
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : '保存失败');
      }
    },
    [editingCourse, editingEvent, view, onDataChanged, onExitEditView]
  );

  const cancel = useCallback(() => {
    setEditingCourse(null);
    setEditingEvent(null);
    if (showEditModal) {
      setShowEditModal(false);
    } else if (view === 'edit') {
      onExitEditView();
    }
  }, [showEditModal, view, onExitEditView]);

  return {
    editingCourse,
    editingEvent,
    showEditModal,
    openFromTimetable,
    openCourse,
    openEvent,
    save,
    cancel,
  };
}
